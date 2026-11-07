import type { HTMLAttributes } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { joinClasses } from "./joinClasses";

export interface PaginationProps extends HTMLAttributes<HTMLElement> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  disabled?: boolean;
  siblingCount?: number;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  loading = false,
  disabled = false,
  siblingCount = 1,
  className,
  ...props
}: PaginationProps) {
  if (totalPages <= 0) return null;

  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = Math.max(1, currentPage - siblingCount);
  const end = Math.min(totalPages, currentPage + siblingCount);
  const pages = Array.from(
    { length: end - start + 1 },
    (_, index) => start + index,
  );
  const interactionDisabled = disabled || loading;

  const changePage = (nextPage: number) => {
    if (!interactionDisabled && nextPage !== currentPage)
      onPageChange(nextPage);
  };

  return (
    <nav
      {...props}
      aria-label="Phân trang"
      aria-busy={loading || undefined}
      className={joinClasses(
        "flex flex-wrap items-center justify-center gap-1.5",
        className,
      )}
    >
      <Button
        variant="outline"
        size="sm"
        aria-label="Trang trước"
        disabled={interactionDisabled || currentPage <= 1}
        onClick={() => changePage(currentPage - 1)}
        startIcon={<ChevronLeft size={16} aria-hidden="true" />}
      >
        Trước
      </Button>
      {start > 1 && (
        <>
          <PageButton
            page={1}
            currentPage={currentPage}
            disabled={interactionDisabled}
            onClick={changePage}
          />
          {start > 2 && (
            <span className="px-1 text-muted" aria-hidden="true">
              …
            </span>
          )}
        </>
      )}
      {pages.map((pageNumber) => (
        <PageButton
          key={pageNumber}
          page={pageNumber}
          currentPage={currentPage}
          disabled={interactionDisabled}
          onClick={changePage}
        />
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-muted" aria-hidden="true">
              …
            </span>
          )}
          <PageButton
            page={totalPages}
            currentPage={currentPage}
            disabled={interactionDisabled}
            onClick={changePage}
          />
        </>
      )}
      <Button
        variant="outline"
        size="sm"
        aria-label="Trang sau"
        disabled={interactionDisabled || currentPage >= totalPages}
        onClick={() => changePage(currentPage + 1)}
        endIcon={<ChevronRight size={16} aria-hidden="true" />}
      >
        Sau
      </Button>
    </nav>
  );
}

function PageButton({
  page,
  currentPage,
  disabled,
  onClick,
}: {
  page: number;
  currentPage: number;
  disabled: boolean;
  onClick: (page: number) => void;
}) {
  const isCurrent = page === currentPage;
  return (
    <Button
      variant={isCurrent ? "primary" : "ghost"}
      size="sm"
      aria-label={`Trang ${page}`}
      aria-current={isCurrent ? "page" : undefined}
      disabled={disabled}
      onClick={() => onClick(page)}
    >
      {page}
    </Button>
  );
}
