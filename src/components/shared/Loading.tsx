import type { HTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { joinClasses } from "./joinClasses";

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
}

export function Loading({
  label = "Đang tải...",
  size = "md",
  fullPage = false,
  className,
  ...props
}: LoadingProps) {
  const spinnerSize =
    size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-6";

  return (
    <div
      {...props}
      role="status"
      aria-live="polite"
      className={joinClasses(
        "flex items-center justify-center gap-2 text-sm text-muted",
        fullPage && "min-h-48",
        className,
      )}
    >
      <LoaderCircle
        className={`${spinnerSize} animate-spin text-brand-highlight`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
