import type { HTMLAttributes, ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
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
  tag?: ReactNode;
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
    borderClass: string;
    iconClass: string;
    actionClass: string;
    progressClass: string;
    icon: ReactNode;
  }
> = {
  success: {
    borderClass: "border-black/[0.08]",
    iconClass: "text-state-success",
    actionClass: "text-state-success decoration-state-success/35 hover:decoration-state-success",
    progressClass: "bg-state-success/55",
    icon: <CheckCircle2 size={17} strokeWidth={2} aria-hidden="true" />,
  },
  error: {
    borderClass: "border-state-danger-border",
    iconClass: "text-state-danger",
    actionClass: "text-state-danger decoration-state-danger/35 hover:decoration-state-danger",
    progressClass: "bg-state-danger/65",
    icon: <AlertCircle size={17} strokeWidth={2} aria-hidden="true" />,
  },
  warning: {
    borderClass: "border-black/[0.08]",
    iconClass: "text-state-warning",
    actionClass: "text-state-warning decoration-state-warning/35 hover:decoration-state-warning",
    progressClass: "bg-state-warning/55",
    icon: <TriangleAlert size={17} strokeWidth={2} aria-hidden="true" />,
  },
  info: {
    borderClass: "border-black/[0.08]",
    iconClass: "text-state-info",
    actionClass: "text-state-info decoration-state-info/35 hover:decoration-state-info",
    progressClass: "bg-state-info/55",
    icon: <Info size={17} strokeWidth={2} aria-hidden="true" />,
  },
  brand: {
    borderClass: "border-brand-pink/45",
    iconClass: "text-brand-highlight",
    actionClass: "text-brand-highlight decoration-brand-highlight/35 hover:decoration-brand-highlight",
    progressClass: "bg-brand-highlight/60",
    icon: <Sparkles size={17} strokeWidth={2} aria-hidden="true" />,
  },
};

export function Toast({
  variant = "info",
  title,
  message,
  tag,
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
        "relative flex w-full max-w-md items-start gap-3 overflow-hidden rounded-xl border bg-white px-4 py-3.5 text-ink shadow-[0_10px_30px_-8px_rgba(24,33,29,0.12),0_1px_3px_rgba(24,33,29,0.06)]",
        selected.borderClass,
        disabled && "opacity-60",
        className,
      )}
    >
      <span className={joinClasses("mt-0.5 shrink-0", selected.iconClass)}>
        {loading ? (
          <LoaderCircle
            className="size-[17px] animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          selected.icon
        )}
      </span>

      <div className="min-w-0 flex-1 break-words">
        {tag && (
          <span className="mb-1 inline-flex items-center rounded-md bg-brand-pink-surface px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-highlight uppercase">
            {tag}
          </span>
        )}
        {title && (
          <p className="text-[13.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
            {title}
          </p>
        )}
        <div
          className={
            title
              ? "mt-0.5 text-[13px] leading-relaxed text-text-secondary"
              : "text-[13.5px] leading-relaxed text-ink"
          }
        >
          {message}
        </div>
        {action && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => {
                action.onClick();
                onClose?.();
              }}
              className={joinClasses(
                "group/action relative z-10 inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-sm text-xs font-semibold underline underline-offset-4 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight",
                selected.actionClass,
              )}
            >
              <span>{action.label}</span>
              <ArrowRight
                size={12}
                strokeWidth={2.2}
                aria-hidden="true"
                className="transition-transform duration-150 group-hover/action:translate-x-0.5 motion-reduce:transition-none"
              />
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
          className="relative z-10 -mr-1 -mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition hover:bg-black/[0.04] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight disabled:cursor-not-allowed"
        >
          <X size={15} strokeWidth={1.9} aria-hidden="true" />
        </button>
      )}

      {showProgress && durationMs > 0 && !loading && (
        <span
          aria-hidden="true"
          className={joinClasses(
            "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left motion-reduce:hidden",
            selected.progressClass,
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
