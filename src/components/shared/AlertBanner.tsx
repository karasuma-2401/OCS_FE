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
  live?: boolean;
}

const bannerVariants: Record<
  AlertBannerVariant,
  {
    containerClass: string;
    iconClass: string;
    titleClass: string;
    bodyClass: string;
    actionClass: string;
    icon: ReactNode;
  }
> = {
  success: {
    containerClass: "border-[#D4E9D8] bg-[#F7FCF8]",
    iconClass: "text-state-success",
    titleClass: "text-[#14472B]",
    bodyClass: "text-[#29523B]",
    actionClass:
      "border-[#BBDDC2] bg-white text-[#14472B] hover:bg-[#EDF7EF]",
    icon: <CheckCircle2 size={17} strokeWidth={2} aria-hidden="true" />,
  },
  info: {
    containerClass: "border-[#D2E0F9] bg-[#F6F9FE]",
    iconClass: "text-state-info",
    titleClass: "text-[#1A356B]",
    bodyClass: "text-[#324B75]",
    actionClass:
      "border-[#BDD2F6] bg-white text-[#1A356B] hover:bg-[#EBF2FD]",
    icon: <Info size={17} strokeWidth={2} aria-hidden="true" />,
  },
  warning: {
    containerClass: "border-[#F1DDB3] bg-[#FEFBF3]",
    iconClass: "text-state-warning",
    titleClass: "text-[#78350F]",
    bodyClass: "text-[#6D471F]",
    actionClass:
      "border-[#E5C789] bg-white text-[#78350F] hover:bg-[#FBF3DE]",
    icon: <TriangleAlert size={17} strokeWidth={2} aria-hidden="true" />,
  },
  error: {
    containerClass: "border-[#F4D0D0] bg-[#FEF7F7]",
    iconClass: "text-state-danger",
    titleClass: "text-[#8F1D1D]",
    bodyClass: "text-[#7A2E2E]",
    actionClass:
      "border-[#EABABA] bg-white text-[#8F1D1D] hover:bg-[#FCECEC]",
    icon: <AlertCircle size={17} strokeWidth={2} aria-hidden="true" />,
  },
  brand: {
    containerClass: "border-[#EDD4DF] bg-[#FDF8FA]",
    iconClass: "text-brand-highlight",
    titleClass: "text-brand-ink",
    bodyClass: "text-text-secondary",
    actionClass:
      "border-[#DFBCCB] bg-white text-brand-highlight hover:bg-brand-pink-surface",
    icon: <Sparkles size={17} strokeWidth={2} aria-hidden="true" />,
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
  live = true,
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
      role={live ? (isError ? "alert" : "status") : undefined}
      aria-live={live ? (isError ? "assertive" : "polite") : undefined}
      className={joinClasses(
        "flex w-full items-start gap-3 rounded-xl border transition-colors",
        compact ? "px-3.5 py-2.5 text-xs" : "px-4 py-3.5 text-sm",
        selected.containerClass,
        className,
      )}
    >
      <span className={joinClasses("mt-0.5 shrink-0", selected.iconClass)}>
        {icon ?? selected.icon}
      </span>

      <div className="min-w-0 flex-1 break-words">
        {title && (
          <p
            className={joinClasses(
              "font-semibold leading-snug tracking-[-0.01em]",
              compact ? "text-xs" : "text-[13.5px]",
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
              compact ? "text-xs" : "text-[13px]",
              selected.bodyClass,
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
                  "inline-flex min-h-8 items-center rounded-lg border px-3 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
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
          className="-mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-black/[0.04] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <X size={15} strokeWidth={1.9} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
