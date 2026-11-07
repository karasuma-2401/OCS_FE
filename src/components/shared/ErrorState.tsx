import type { HTMLAttributes, ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "./Button";
import { joinClasses } from "./joinClasses";

export interface ErrorStateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function ErrorState({
  title = "Đã xảy ra lỗi",
  description = "Không thể tải dữ liệu. Vui lòng thử lại.",
  onRetry,
  retryLabel = "Thử lại",
  loading = false,
  disabled = false,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      {...props}
      role="alert"
      className={joinClasses(
        "flex flex-col items-center justify-center rounded-2xl border border-state-danger-border bg-state-danger-soft px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-white text-state-danger">
        <TriangleAlert size={22} aria-hidden="true" />
      </span>
      <h3 className="font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-lg text-sm text-muted">{description}</p>
      )}
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          loading={loading}
          disabled={disabled}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
