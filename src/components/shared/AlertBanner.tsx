import type { HTMLAttributes, ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { joinClasses } from "./joinClasses";

export type AlertBannerVariant =
  | "success"
  | "info"
  | "warning"
  | "error"
  | "brand";

export interface AlertBannerAction {
  label: string;
  onClick: () => void;
}

export interface AlertBannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertBannerVariant;
  title?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  icon?: ReactNode;
  action?: AlertBannerAction | ReactNode;
  onClose?: () => void;
  compact?: boolean;
}

const bannerVariants: Record<
  AlertBannerVariant,
  {
    containerClass: string;
    iconClass: string;
    titleClass: string;
    actionClass: string;
    icon: ReactNode;
  }
> = {
  success: {
    containerClass:
      "border-state-success-border bg-state-success-soft text-state-success-strong",
    iconClass: "text-state-success-icon",
    titleClass: "text-state-success-deep",
    actionClass:
      "border-state-success-border bg-white/80 text-state-success-strong hover:bg-state-success-muted",
    icon: <CheckCircle2 size={18} aria-hidden="true" />,
  },
  info: {
    containerClass:
      "border-state-info-border bg-state-info-soft text-state-info",
    iconClass: "text-state-info-icon",
    titleClass: "text-state-info-strong",
    actionClass:
      "border-state-info-border bg-white/80 text-state-info-strong hover:bg-state-info-muted",
    icon: <Info size={18} aria-hidden="true" />,
  },
  warning: {
    containerClass:
      "border-state-warning-border bg-state-warning-soft text-state-warning-strong",
    iconClass: "text-state-warning-icon",
    titleClass: "text-state-warning-strong",
    actionClass:
      "border-state-warning-border bg-white/80 text-state-warning-strong hover:bg-state-warning-muted",
    icon: <TriangleAlert size={18} aria-hidden="true" />,
  },
  error: {
    containerClass:
      "border-state-danger-border bg-state-danger-soft text-state-danger",
    iconClass: "text-state-danger-icon",
    titleClass: "text-state-danger",
    actionClass:
      "border-state-danger-border bg-white/80 text-state-danger hover:bg-state-danger-border/40",
    icon: <AlertCircle size={18} aria-hidden="true" />,
  },
  brand: {
    containerClass:
      "border-brand-pink/40 bg-brand-pink-surface text-brand-ink",
    iconClass: "text-brand-highlight",
    titleClass: "text-brand-highlight",
    actionClass:
      "border-brand-pink/50 bg-white/90 text-brand-highlight hover:bg-brand-pink-light",
    icon: <Sparkles size={18} aria-hidden="true" />,
  },
};

function isActionObject(
  action: AlertBannerAction | ReactNode,
): action is AlertBannerAction {
  return (
    typeof action === "object" &&
    action !== null &&
    "label" in action &&
    "onClick" in action
  );
}

export function AlertBanner({
  variant = "info",
  title,
  description,
  message,
  icon,
  action,
  onClose,
  compact = false,
  children,
  className,
  ...props
}: AlertBannerProps) {
  const isError = variant === "error";
  const selected = bannerVariants[variant];
  const bodyContent = description ?? message ?? children;

  return (
    <div
      {...props}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={joinClasses(
        "flex w-full items-start gap-3 rounded-xl border transition-all",
        compact ? "px-3.5 py-2.5 text-xs" : "p-4 text-sm",
        selected.containerClass,
        className,
      )}
    >
      <span className={joinClasses("mt-0.5 shrink-0", selected.iconClass)}>
        {icon ?? selected.icon}
      </span>

      <div className="min-w-0 flex-1">
        {title && (
          <p
            className={joinClasses(
              "font-bold leading-snug",
              compact ? "text-xs" : "text-sm",
              selected.titleClass,
            )}
          >
            {title}
          </p>
        )}
        {bodyContent && (
          <div
            className={joinClasses(
              "leading-relaxed",
              title ? "mt-0.5" : "",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {bodyContent}
          </div>
        )}
        {action && (
          <div className="mt-2.5">
            {isActionObject(action) ? (
              <button
                type="button"
                onClick={action.onClick}
                className={joinClasses(
                  "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                  selected.actionClass,
                )}
              >
                {action.label}
              </button>
            ) : (
              action
            )}
          </div>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="shrink-0 rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
