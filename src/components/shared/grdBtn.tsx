import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import "./grdBtn.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

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
      className={[
        "grd-btn",
        `grd-btn--${variant}`,
        `grd-btn--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <LoaderCircle className="grd-btn__spinner" size={16} aria-hidden="true" />
      ) : (
        startIcon
      )}
      <span>{loading && loadingText ? loadingText : children}</span>
      {!loading && endIcon}
    </button>
  );
}

export default Button;