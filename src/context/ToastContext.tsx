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
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Toast, type ToastAction, type ToastVariant } from "@/components/shared/Toast";

export interface ToastOptions {
  id?: string;
  variant?: ToastVariant;
  title?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  tag?: ReactNode;
  action?: ToastAction;
  duration?: number;
  loading?: boolean;
}

export interface ActiveToastItem {
  id: string;
  variant: ToastVariant;
  title?: ReactNode;
  message: ReactNode;
  tag?: ReactNode;
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
  const [isDeckExpanded, setIsDeckExpanded] = useState(false);
  const [isDeckPaused, setIsDeckPaused] = useState(false);
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
      setToasts((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (next.length <= 1) {
          setIsDeckExpanded(false);
        }
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

  const pauseAllTimers = useCallback(() => {
    setIsDeckPaused(true);
    const now = Date.now();
    timersRef.current.forEach((entry, id) => {
      window.clearTimeout(entry.timerId);
      const elapsed = now - entry.startedAt;
      const remaining = Math.max(800, entry.remaining - elapsed);
      timersRef.current.set(id, { ...entry, remaining });
    });
  }, []);

  const resumeAllTimers = useCallback(() => {
    setIsDeckPaused(false);
    timersRef.current.forEach((entry, id) => {
      if (entry.remaining > 0) {
        scheduleAutoDismiss(id, entry.remaining);
      }
    });
  }, [scheduleAutoDismiss]);

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
        options.title !== undefined &&
        (options.description !== undefined || options.message !== undefined);

      const resolvedTitle = hasBothTitleAndDescription ? options.title : undefined;
      const resolvedMessage =
        options.description ?? options.message ?? options.title ?? "Thông báo hệ thống";

      const newItem: ActiveToastItem = {
        id,
        variant,
        title: resolvedTitle,
        message: resolvedMessage,
        tag: options.tag,
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
    setIsDeckExpanded(false);
    setIsDeckPaused(false);
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

  const isStacked = toasts.length > 1 && !isDeckExpanded;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Stacked Tag Deck Floating Toast Viewport */}
      {toasts.length > 0 && (
        <div
          role="region"
          aria-label="Thông báo nhanh"
          onMouseEnter={() => {
            if (toasts.length > 1) setIsDeckExpanded(true);
            pauseAllTimers();
          }}
          onMouseLeave={() => {
            setIsDeckExpanded(false);
            resumeAllTimers();
          }}
          onFocus={() => {
            if (toasts.length > 1) setIsDeckExpanded(true);
            pauseAllTimers();
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setIsDeckExpanded(false);
              resumeAllTimers();
            }
          }}
          className="pointer-events-auto fixed inset-x-3 top-3 z-[200] flex flex-col items-center pt-[env(safe-area-inset-top)] sm:inset-x-auto sm:top-18 sm:right-4 sm:w-full sm:max-w-[23.5rem] sm:items-end print:hidden"
        >
          {/* Compact Deck Toolbar when 2+ toasts are active */}
          {toasts.length > 1 && (
            <div className="mb-2 flex w-full items-center justify-between gap-2 rounded-full border border-black/[0.08] bg-white/95 px-3 py-1 text-xs shadow-xs backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setIsDeckExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 font-medium text-ink hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
              >
                {isDeckExpanded ? (
                  <ChevronUp size={14} aria-hidden="true" />
                ) : (
                  <ChevronDown size={14} aria-hidden="true" />
                )}
                <span>
                  {toasts.length} thông báo
                  {!isDeckExpanded ? " · Mở rộng" : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-muted transition hover:bg-black/[0.04] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
              >
                <X size={12} aria-hidden="true" />
                <span>Đóng hết</span>
              </button>
            </div>
          )}

          {/* Stacked / Expanded Toast Cards */}
          <div className="flex w-full flex-col">
            {toasts.map((item, index) => {
              const stackStyle = isStacked
                ? index === 0
                  ? "relative z-40 mt-0 scale-100 opacity-100"
                  : index === 1
                    ? "relative z-30 -mt-11 h-13 scale-[0.96] overflow-hidden opacity-100 [&>div]:h-13 [&>div]:bg-white [&>div]:border-black/[0.08] [&>div>*]:invisible"
                    : index === 2
                      ? "relative z-20 -mt-11 h-13 scale-[0.92] overflow-hidden opacity-90 [&>div]:h-13 [&>div]:bg-neutral-50 [&>div]:border-black/[0.08] [&>div>*]:invisible"
                      : "relative z-10 -mt-11 h-13 scale-[0.88] overflow-hidden opacity-75 [&>div]:h-13 [&>div]:bg-neutral-100 [&>div]:border-black/[0.08] [&>div>*]:invisible"
                : index === 0
                  ? "relative z-40 mt-0 scale-100 opacity-100"
                  : "relative z-30 mt-2.5 scale-100 opacity-100";

              return (
                <div
                  key={item.id}
                  className={`w-full origin-top transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] animate-toast-enter motion-reduce:animate-none motion-reduce:transition-none ${stackStyle}`}
                >
                  <Toast
                    variant={item.variant}
                    title={item.title}
                    message={item.message}
                    tag={item.tag}
                    action={item.action}
                    loading={item.loading}
                    showProgress={item.duration > 0 && (!isStacked || index === 0)}
                    durationMs={item.duration}
                    paused={isDeckPaused}
                    onClose={() => dismiss(item.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
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
