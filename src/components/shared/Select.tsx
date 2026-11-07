import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { InlineError } from "./InlineError";
import { joinClasses } from "./joinClasses";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  loading?: boolean;
}

export function Select({
  id,
  label,
  error,
  helperText,
  loading = false,
  disabled = false,
  className,
  children,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;
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
          htmlFor={selectId}
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          id={selectId}
          disabled={disabled || loading}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          aria-busy={loading || undefined}
          className={joinClasses(
            "w-full appearance-none rounded-xl border bg-paper px-3.5 py-2.5 pr-10 text-sm text-ink outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-70",
            error
              ? "border-state-danger focus:border-state-danger focus:ring-state-danger/20"
              : "border-border focus:border-brand-pink-focus focus:ring-brand-pink/25",
            className,
          )}
        >
          {children}
        </select>
        {loading ? (
          <LoaderCircle
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-brand-highlight"
            aria-label="Đang tải"
          />
        ) : (
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
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
