import type { FormHTMLAttributes, ReactNode } from "react";
import { joinClasses } from "./joinClasses";

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  loading?: boolean;
  disabled?: boolean;
  error?: ReactNode;
}

export function Form({
  loading = false,
  disabled = false,
  error,
  className,
  children,
  ...props
}: FormProps) {
  return (
    <form
      {...props}
      aria-busy={loading || undefined}
      className={joinClasses("space-y-4", className)}
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-state-danger-border bg-state-danger-soft p-3.5 text-sm text-state-danger"
        >
          {error}
        </div>
      )}
      <fieldset
        disabled={disabled || loading}
        className="min-w-0 space-y-4 border-0 p-0 disabled:opacity-70"
      >
        {children}
      </fieldset>
    </form>
  );
}
