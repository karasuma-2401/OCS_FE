import type { HTMLAttributes, ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Loading } from "./Loading";
import { joinClasses } from "./joinClasses";

export interface EmptyStateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
}

export function EmptyState({
  title = "Chưa có dữ liệu",
  description,
  icon,
  action,
  loading = false,
  className,
  ...props
}: EmptyStateProps) {
  if (loading) {
    return <Loading {...props} className={className} />;
  }

  return (
    <div
      {...props}
      className={joinClasses(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-paper px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-pink-light text-brand-highlight">
        {icon ?? <Inbox size={22} aria-hidden="true" />}
      </span>
      <h3 className="font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-lg text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
