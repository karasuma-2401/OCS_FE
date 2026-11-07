import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { InlineError } from "./InlineError";
import { joinClasses } from "./joinClasses";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  loading?: boolean;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}

export function Input({
  id,
  label,
  error,
  helperText,
  loading = false,
  disabled = false,
  startAdornment,
  endAdornment,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy =
    [
      ariaDescribedBy,
      error ? errorId : undefined,
      helperText && !error ? helperId : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {startAdornment && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
            {startAdornment}
          </span>
        )}
        <input
          {...props}
          id={inputId}
          disabled={disabled || loading}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          aria-busy={loading || undefined}
          className={joinClasses(
            "w-full rounded-xl border bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-70",
            error
              ? "border-state-danger focus:border-state-danger focus:ring-state-danger/20"
              : "border-border focus:border-brand-pink-focus focus:ring-brand-pink/25",
            startAdornment ? "pl-10" : undefined,
            endAdornment || loading ? "pr-10" : undefined,
            className,
          )}
        />
        {loading ? (
          <LoaderCircle
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-brand-highlight"
            aria-label="Đang tải"
          />
        ) : (
          endAdornment && (
            <span className="absolute inset-y-0 right-3 flex items-center text-muted">
              {endAdornment}
            </span>
          )
        )}
      </div>
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-xs text-muted">
          {helperText}
        </p>
      )}
      {error && (
        <div id={errorId}>
          <InlineError>{error}</InlineError>
        </div>
      )}
    </div>
  );
}
