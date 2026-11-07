import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-5 py-3 text-base",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "ocs-button--primary bg-button-pastel text-brand-ink shadow-[0_2px_8px_color-mix(in_srgb,var(--color-button-pastel)_35%,transparent)] enabled:hover:bg-button-pastel-hover enabled:hover:shadow-[0_3px_10px_color-mix(in_srgb,var(--color-brand-pink)_35%,transparent)]",
  secondary: "bg-brand-pink text-brand-ink enabled:hover:bg-brand-pink-hover",
  outline: "border-[color:color-mix(in_srgb,var(--color-brand-lavender)_60%,var(--color-border))] bg-paper text-brand-ink enabled:hover:border-brand-pink enabled:hover:bg-brand-pink-surface",
  ghost: "bg-transparent text-brand-highlight enabled:hover:bg-brand-pink-light",
  danger: "bg-danger text-white enabled:hover:bg-state-danger-strong",
};

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  loadingText,
  startIcon,
  endIcon,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={twMerge(
        "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent font-sans font-bold leading-tight transition-[background,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink-focus enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:duration-[0.01ms]",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
    >
      {loading ? (
        <LoaderCircle className="shrink-0 animate-[spin_0.8s_linear_infinite] motion-reduce:animate-none" size={16} aria-hidden="true" />
      ) : (
        startIcon
      )}
      <span>{loading && loadingText ? loadingText : children}</span>
      {!loading && endIcon}
    </button>
  );
}

export default Button;
