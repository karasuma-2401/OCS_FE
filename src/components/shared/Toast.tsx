import type { HTMLAttributes, ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { joinClasses } from "./joinClasses";

export type ToastVariant = "success" | "error" | "warning" | "info" | "brand";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: ToastVariant;
  title?: ReactNode;
  message: ReactNode;
  action?: ToastAction;
  onClose?: () => void;
  disabled?: boolean;
  loading?: boolean;
  showProgress?: boolean;
  durationMs?: number;
  paused?: boolean;
}

const toastVariants: Record<
  ToastVariant,
  {
    className: string;
    iconClassName: string;
    progressClassName: string;
    actionClassName: string;
    icon: ReactNode;
  }
> = {
  success: {
    className:
      "border-state-success-border bg-state-success-soft text-state-success-strong",
    iconClassName: "text-state-success-icon",
    progressClassName: "bg-state-success-icon/40",
    actionClassName:
      "border-state-success-border bg-white text-state-success-strong hover:bg-state-success-muted",
    icon: <CheckCircle2 size={19} aria-hidden="true" />,
  },
  error: {
    className:
      "border-state-danger-border bg-state-danger-soft text-state-danger",
    iconClassName: "text-state-danger-icon",
    progressClassName: "bg-state-danger-icon/40",
    actionClassName:
      "border-state-danger-border bg-white text-state-danger hover:bg-state-danger-border/40",
    icon: <AlertCircle size={19} aria-hidden="true" />,
  },
  warning: {
    className:
      "border-state-warning-border bg-state-warning-soft text-state-warning-strong",
    iconClassName: "text-state-warning-icon",
    progressClassName: "bg-state-warning-icon/40",
    actionClassName:
      "border-state-warning-border bg-white text-state-warning-strong hover:bg-state-warning-muted",
    icon: <TriangleAlert size={19} aria-hidden="true" />,
  },
  info: {
    className:
      "border-state-info-border bg-state-info-soft text-state-info",
    iconClassName: "text-state-info-icon",
    progressClassName: "bg-state-info-icon/40",
    actionClassName:
      "border-state-info-border bg-white text-state-info-strong hover:bg-state-info-muted",
    icon: <Info size={19} aria-hidden="true" />,
  },
  brand: {
    className:
      "border-brand-pink/50 bg-brand-pink-surface text-brand-ink",
    iconClassName: "text-brand-highlight",
    progressClassName: "bg-brand-pink",
    actionClassName:
      "border-brand-pink/60 bg-white text-brand-highlight hover:bg-brand-pink-light",
    icon: <Sparkles size={19} aria-hidden="true" />,
  },
};

export function Toast({
  variant = "info",
  title,
  message,
  action,
  onClose,
  disabled = false,
  loading = false,
  showProgress = false,
  durationMs = 4500,
  paused = false,
  className,
  ...props
}: ToastProps) {
  const isError = variant === "error";
  const selected = toastVariants[variant];

  return (
    <div
      {...props}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-busy={loading || undefined}
      className={joinClasses(
        "relative overflow-hidden flex w-full max-w-md items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-xs",
        selected.className,
        disabled && "opacity-60",
        className,
      )}
    >
      <span className={joinClasses("mt-0.5 shrink-0", selected.iconClassName)}>
        {loading ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          selected.icon
        )}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-bold leading-snug">{title}</p>}
        <div className={title ? "mt-0.5 text-xs sm:text-sm leading-relaxed" : "text-sm leading-relaxed"}>
          {message}
        </div>
        {action && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => {
                action.onClick();
                onClose?.();
              }}
              className={joinClasses(
                "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold shadow-2xs transition active:scale-95",
                selected.actionClassName,
              )}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={disabled || loading}
          aria-label="Đóng thông báo"
          className="shrink-0 rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
      {showProgress && durationMs > 0 && !loading && (
        <span
          aria-hidden="true"
          className={joinClasses(
            "absolute inset-x-0 bottom-0 h-1 origin-left",
            selected.progressClassName,
          )}
          style={{
            animation: `toast-progress ${durationMs}ms linear forwards`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      )}
    </div>
  );
}
