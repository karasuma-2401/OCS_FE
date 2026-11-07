import type { HTMLAttributes, ReactNode } from "react";
import { ErrorState } from "./ErrorState";
import { SkeletonLoading } from "./Skeleton";
import { joinClasses } from "./joinClasses";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  disabled?: boolean;
}

export function Card({
  title,
  description,
  actions,
  loading = false,
  error,
  disabled = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <section
      {...props}
      aria-busy={loading || undefined}
      aria-disabled={disabled || undefined}
      className={joinClasses(
        "rounded-2xl border border-brand-lavender/40 bg-paper p-5 shadow-sm sm:p-6",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      {(title || description || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-bold text-ink">{title}</h2>}
            {description && (
              <p className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      {error ? (
        <ErrorState
          title="Không thể tải nội dung"
          description={error}
          className="border-0 px-4 py-6 shadow-none"
        />
      ) : loading ? (
        <SkeletonLoading variant="list" count={2} />
      ) : (
        children
      )}
    </section>
  );
}
