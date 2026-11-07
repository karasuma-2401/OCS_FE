import type { HTMLAttributes, ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { SkeletonLoading } from "./Skeleton";
import { joinClasses } from "./joinClasses";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  accessor?: keyof T;
  render?: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface TableProps<T> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  columns: ReadonlyArray<TableColumn<T>>;
  data: ReadonlyArray<T>;
  rowKey?: keyof T | ((row: T, index: number) => string | number);
  loading?: boolean;
  error?: ReactNode;
  disabled?: boolean;
  emptyTitle?: ReactNode;
  emptyMessage?: ReactNode;
}

export function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error,
  disabled = false,
  emptyTitle = "Không có dữ liệu",
  emptyMessage = "Chưa có mục nào để hiển thị.",
  className,
  ...props
}: TableProps<T>) {
  let content: ReactNode;

  if (error) {
    content = (
      <ErrorState
        title="Không thể tải bảng dữ liệu"
        description={error}
        className="border-0 shadow-none"
      />
    );
  } else if (loading) {
    content = (
      <SkeletonLoading
        variant="table"
        label="Đang tải dữ liệu..."
        className="p-4"
      />
    );
  } else if (data.length === 0) {
    content = (
      <EmptyState
        title={emptyTitle}
        description={emptyMessage}
        className="border-0 shadow-none"
      />
    );
  } else {
    content = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-brand-pink-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={joinClasses(
                    "px-4 py-3 font-bold",
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, index) => {
              const key =
                typeof rowKey === "function"
                  ? rowKey(row, index)
                  : rowKey
                    ? String(row[rowKey])
                    : index;

              return (
                <tr
                  key={key}
                  className="transition-colors hover:bg-brand-pink-surface"
                >
                  {columns.map((column) => {
                    const value = column.accessor
                      ? row[column.accessor]
                      : undefined;
                    const renderedValue = column.render
                      ? column.render(row, index)
                      : value == null
                        ? ""
                        : String(value);

                    return (
                      <td
                        key={column.key}
                        className={joinClasses(
                          "px-4 py-3 text-ink",
                          column.cellClassName,
                        )}
                      >
                        {renderedValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      {...props}
      aria-busy={loading || undefined}
      aria-disabled={disabled || undefined}
      className={joinClasses(
        "overflow-hidden rounded-xl border border-brand-lavender/40 bg-paper",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      {content}
    </div>
  );
}
