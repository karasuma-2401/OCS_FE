import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Toast, type ToastAction, type ToastVariant } from "@/components/shared/Toast";

export interface ToastOptions {
  id?: string;
  variant?: ToastVariant;
  title?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  action?: ToastAction;
  duration?: number;
  loading?: boolean;
}

export interface ActiveToastItem {
  id: string;
  variant: ToastVariant;
  title?: ReactNode;
  message: ReactNode;
  action?: ToastAction;
  duration: number;
  loading?: boolean;
  createdAt: number;
}

export interface ToastContextValue {
  toasts: ActiveToastItem[];
  show: (options: ToastOptions) => string;
  success: (titleOrMessage: ReactNode, options?: Omit<ToastOptions, "variant">) => string;
  error: (titleOrMessage: ReactNode, options?: Omit<ToastOptions, "variant">) => string;
  warning: (titleOrMessage: ReactNode, options?: Omit<ToastOptions, "variant">) => string;
  info: (titleOrMessage: ReactNode, options?: Omit<ToastOptions, "variant">) => string;
  brand: (titleOrMessage: ReactNode, options?: Omit<ToastOptions, "variant">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const MAX_VISIBLE_TOASTS = 4;
const DEFAULT_DURATION_MS = 4500;

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;
function nextToastId(): string {
  toastCounter += 1;
  return `ocs-toast-${Date.now()}-${toastCounter}`;
}

export function dispatchGlobalToast(options: ToastOptions): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ToastOptions>("ocs:toast", { detail: options }));
  }
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ActiveToastItem[]>([]);
  const [pausedIds, setPausedIds] = useState<Record<string, boolean>>({});
  const timersRef = useRef<Map<string, { timerId: number; remaining: number; startedAt: number }>>(
    new Map(),
  );

  const clearTimer = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (entry) {
      window.clearTimeout(entry.timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((item) => item.id !== id));
      setPausedIds((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [clearTimer],
  );

  const scheduleAutoDismiss = useCallback(
    (id: string, durationMs: number) => {
      if (durationMs <= 0 || typeof window === "undefined") return;
      clearTimer(id);
      const startedAt = Date.now();
      const timerId = window.setTimeout(() => {
        dismiss(id);
      }, durationMs);
      timersRef.current.set(id, { timerId, remaining: durationMs, startedAt });
    },
    [clearTimer, dismiss],
  );

  const pauseToast = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (!entry) return;
    window.clearTimeout(entry.timerId);
    const elapsed = Date.now() - entry.startedAt;
    const remaining = Math.max(600, entry.remaining - elapsed);
    timersRef.current.set(id, { ...entry, remaining });
    setPausedIds((prev) => ({ ...prev, [id]: true }));
  }, []);

  const resumeToast = useCallback(
    (id: string) => {
      const entry = timersRef.current.get(id);
      setPausedIds((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (!entry || entry.remaining <= 0) return;
      scheduleAutoDismiss(id, entry.remaining);
    },
    [scheduleAutoDismiss],
  );

  const show = useCallback(
    (options: ToastOptions): string => {
      const id = options.id || nextToastId();
      const variant: ToastVariant = options.variant ?? "info";
      const duration =
        options.duration !== undefined
          ? options.duration
          : options.loading
            ? 0
            : variant === "error"
              ? 6000
              : DEFAULT_DURATION_MS;

      const hasBothTitleAndDescription =
        options.title !== undefined && (options.description !== undefined || options.message !== undefined);

      const resolvedTitle = hasBothTitleAndDescription ? options.title : options.description ? options.title : undefined;
      const resolvedMessage =
        options.description ?? options.message ?? options.title ?? "Thông báo hệ thống";

      const newItem: ActiveToastItem = {
        id,
        variant,
        title: resolvedTitle,
        message: resolvedMessage,
        action: options.action,
        duration,
        loading: options.loading,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        const next = [newItem, ...filtered];
        if (next.length > MAX_VISIBLE_TOASTS) {
          const evicted = next.slice(MAX_VISIBLE_TOASTS);
          evicted.forEach((e) => clearTimer(e.id));
          return next.slice(0, MAX_VISIBLE_TOASTS);
        }
        return next;
      });

      if (duration > 0 && !options.loading) {
        scheduleAutoDismiss(id, duration);
      }

      return id;
    },
    [clearTimer, scheduleAutoDismiss],
  );

  const createVariantHelper = useCallback(
    (variant: ToastVariant) =>
      (titleOrMessage: ReactNode, options?: Omit<ToastOptions, "variant">): string => {
        if (options?.description !== undefined || options?.message !== undefined) {
          return show({
            ...options,
            variant,
            title: options.title ?? titleOrMessage,
            description: options.description ?? options.message,
          });
        }
        return show({
          ...options,
          variant,
          title: options?.title,
          message: titleOrMessage,
        });
      },
    [show],
  );

  const clear = useCallback(() => {
    timersRef.current.forEach((entry) => window.clearTimeout(entry.timerId));
    timersRef.current.clear();
    setToasts([]);
    setPausedIds({});
  }, []);

  useEffect(() => {
    const handleGlobalEvent = (event: Event) => {
      const custom = event as CustomEvent<ToastOptions>;
      if (custom.detail) {
        show(custom.detail);
      }
    };
    window.addEventListener("ocs:toast", handleGlobalEvent);
    return () => {
      window.removeEventListener("ocs:toast", handleGlobalEvent);
    };
  }, [show]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((entry) => window.clearTimeout(entry.timerId));
      timersRef.current.clear();
    };
  }, []);

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      toasts,
      show,
      success: createVariantHelper("success"),
      error: createVariantHelper("error"),
      warning: createVariantHelper("warning"),
      info: createVariantHelper("info"),
      brand: createVariantHelper("brand"),
      dismiss,
      clear,
    }),
    [toasts, show, createVariantHelper, dismiss, clear],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Floating Toast Viewport: Top-Center on mobile, Top-Right on desktop */}
      <div
        aria-label="Thông báo nhanh"
        className="pointer-events-none fixed inset-x-3 top-3 z-[200] flex flex-col items-center gap-2.5 sm:inset-x-auto sm:top-4 sm:right-4 sm:w-full sm:max-w-sm sm:items-end print:hidden"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            onMouseEnter={() => pauseToast(item.id)}
            onMouseLeave={() => resumeToast(item.id)}
            className="pointer-events-auto w-full animate-toast-enter"
          >
            <Toast
              variant={item.variant}
              title={item.title}
              message={item.message}
              action={item.action}
              loading={item.loading}
              showProgress={item.duration > 0}
              durationMs={item.duration}
              paused={Boolean(pausedIds[item.id])}
              onClose={() => dismiss(item.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const fallbackToastValue: ToastContextValue = {
  toasts: [],
  show: (options) => {
    dispatchGlobalToast(options);
    return options.id || "fallback-toast";
  },
  success: (msg, opts) => {
    dispatchGlobalToast({ ...opts, variant: "success", message: msg });
    return "fallback-toast";
  },
  error: (msg, opts) => {
    dispatchGlobalToast({ ...opts, variant: "error", message: msg });
    return "fallback-toast";
  },
  warning: (msg, opts) => {
    dispatchGlobalToast({ ...opts, variant: "warning", message: msg });
    return "fallback-toast";
  },
  info: (msg, opts) => {
    dispatchGlobalToast({ ...opts, variant: "info", message: msg });
    return "fallback-toast";
  },
  brand: (msg, opts) => {
    dispatchGlobalToast({ ...opts, variant: "brand", message: msg });
    return "fallback-toast";
  },
  dismiss: () => {},
  clear: () => {},
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? fallbackToastValue;
}
