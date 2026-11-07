import type { HTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { joinClasses } from "./joinClasses";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  disabled?: boolean;
  loading?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  success: "bg-state-success-soft text-state-success-strong",
  warning: "bg-state-warning-soft text-state-warning-strong",
  danger: "bg-state-danger-soft text-state-danger",
  info: "bg-brand-pink-light text-brand-highlight",
  neutral: "bg-brand-pink-surface text-brand-ink",
};

export function Badge({
  variant = "neutral",
  disabled = false,
  loading = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      className={joinClasses(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        badgeVariants[variant],
        disabled && "opacity-50",
        className,
      )}
    >
      {loading && (
        <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
