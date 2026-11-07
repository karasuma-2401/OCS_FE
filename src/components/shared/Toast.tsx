import type { HTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { joinClasses } from "./joinClasses";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  variant?: ToastVariant;
  title?: ReactNode;
  message: ReactNode;
  onClose?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const toastVariants: Record<
  ToastVariant,
  { className: string; icon: ReactNode }
> = {
  success: {
    className:
      "border-state-success-border bg-state-success-soft text-state-success-strong",
    icon: <CheckCircle2 size={19} aria-hidden="true" />,
  },
  error: {
    className:
      "border-state-danger-border bg-state-danger-soft text-state-danger",
    icon: <AlertCircle size={19} aria-hidden="true" />,
  },
  warning: {
    className:
      "border-state-warning/20 bg-state-warning-soft text-state-warning-strong",
    icon: <TriangleAlert size={19} aria-hidden="true" />,
  },
  info: {
    className:
      "border-brand-pink/40 bg-brand-pink-surface text-brand-highlight",
    icon: <Info size={19} aria-hidden="true" />,
  },
};

export function Toast({
  variant = "info",
  title,
  message,
  onClose,
  disabled = false,
  loading = false,
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
        "flex w-full max-w-md items-start gap-3 rounded-xl border p-4 shadow-lg",
        selected.className,
        disabled && "opacity-60",
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">
        {loading ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          selected.icon
        )}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        <p className={title ? "mt-0.5 text-sm" : "text-sm"}>{message}</p>
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
    </div>
  );
}
