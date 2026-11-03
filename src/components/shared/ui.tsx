import {
  useEffect,
  useId,
  useRef,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Inbox,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "./grdBtn";

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function InlineError({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-state-danger">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

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
  const describedBy = [ariaDescribedBy, error ? errorId : undefined, helperText && !error ? helperId : undefined]
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
      {error && <div id={errorId}><InlineError>{error}</InlineError></div>}
    </div>
  );
}

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
  const describedBy = [ariaDescribedBy, error ? errorId : undefined, helperText && !error ? helperId : undefined]
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
      {error && <div id={errorId}><InlineError>{error}</InlineError></div>}
    </div>
  );
}

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
  const spinnerSize = size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-6";

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
      <LoaderCircle className={`${spinnerSize} animate-spin text-brand-highlight`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
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
      {description && <p className="mt-1.5 max-w-lg text-sm text-muted">{description}</p>}
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

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
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
      {description && <p className="mt-1.5 max-w-lg text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

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
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
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
        <Loading className="min-h-28" />
      ) : (
        children
      )}
    </section>
  );
}

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  disabled?: boolean;
  loading?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  success: "bg-state-success-soft text-state-success-strong",
  warning: "bg-state-warning-soft text-state-warning-strong",
  danger: "bg-state-danger-soft text-state-danger",
  info: "bg-brand-pink-light text-brand-highlight",
  neutral: "bg-brand-pink-surface text-brand-ink",
};

export function Badge({
  variant = "neutral",
  disabled = false,
  loading = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      className={joinClasses(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        badgeVariants[variant],
        disabled && "opacity-50",
        className,
      )}
    >
      {loading && <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />}
      {children}
    </span>
  );
}

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: ToastVariant;
  title?: ReactNode;
  message: ReactNode;
  onClose?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const toastVariants: Record<ToastVariant, { className: string; icon: ReactNode }> = {
  success: {
    className: "border-state-success-border bg-state-success-soft text-state-success-strong",
    icon: <CheckCircle2 size={19} aria-hidden="true" />,
  },
  error: {
    className: "border-state-danger-border bg-state-danger-soft text-state-danger",
    icon: <AlertCircle size={19} aria-hidden="true" />,
  },
  warning: {
    className: "border-state-warning/20 bg-state-warning-soft text-state-warning-strong",
    icon: <TriangleAlert size={19} aria-hidden="true" />,
  },
  info: {
    className: "border-brand-pink/40 bg-brand-pink-surface text-brand-highlight",
    icon: <Info size={19} aria-hidden="true" />,
  },
};

export function Toast({
  variant = "info",
  title,
  message,
  onClose,
  disabled = false,
  loading = false,
  className,
  ...props
}: ToastProps) {
  const isError = variant === "error";
  const selected = toastVariants[variant];

  return (
    <div
      {...props}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-busy={loading || undefined}
      className={joinClasses(
        "flex w-full max-w-md items-start gap-3 rounded-xl border p-4 shadow-lg",
        selected.className,
        disabled && "opacity-60",
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">
        {loading ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          selected.icon
        )}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        <p className={title ? "mt-0.5 text-sm" : "text-sm"}>{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={disabled || loading}
          aria-label="Đóng thông báo"
          className="shrink-0 rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  error?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  error,
  loading = false,
  disabled = false,
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeDisabled = loading || disabled;
  const closeDisabledRef = useRef(closeDisabled);
  const onCloseRef = useRef(onClose);
  closeDisabledRef.current = closeDisabled;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const getFocusableElements = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.matches(":disabled") && element.tabIndex >= 0);

    (getFocusableElements()[0] ?? dialog)?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabledRef.current) {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          closeOnBackdrop &&
          event.target === event.currentTarget &&
          !closeDisabled
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={loading || undefined}
        className={joinClasses(
          "my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-brand-lavender/50 bg-paper shadow-2xl",
          className,
        )}
      >
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--color-brand-pink-gradient), var(--color-brand-lavender-gradient) 52%, var(--color-brand-blue-gradient))",
          }}
        />
        <header className="flex items-start justify-between gap-4 border-b border-brand-lavender/30 bg-brand-pink-surface px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-ink">{title}</h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Đóng hộp thoại"
            className="rounded-lg p-1.5 text-muted transition hover:bg-brand-pink-light hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-pink-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {error && (
          <div className="px-5 pt-4 sm:px-6" role="alert">
            <InlineError>{error}</InlineError>
          </div>
        )}
        <fieldset
          disabled={closeDisabled}
          className="min-w-0 border-0 p-0"
        >
          <div className="px-5 py-5 sm:px-6">
            {loading ? <Loading /> : children}
          </div>
        </fieldset>
        {footer && (
          <fieldset
            disabled={closeDisabled}
            className="min-w-0 border-0 p-0"
          >
            <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
              {footer}
            </footer>
          </fieldset>
        )}
      </section>
    </div>,
    document.body,
  );
}

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  accessor?: keyof T;
  render?: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface TableProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
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
    content = <ErrorState title="Không thể tải bảng dữ liệu" description={error} className="border-0 shadow-none" />;
  } else if (loading) {
    content = <Loading fullPage label="Đang tải dữ liệu..." />;
  } else if (data.length === 0) {
    content = <EmptyState title={emptyTitle} description={emptyMessage} className="border-0 shadow-none" />;
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
                  className={joinClasses("px-4 py-3 font-bold", column.headerClassName)}
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
                <tr key={key} className="transition-colors hover:bg-brand-pink-surface">
                  {columns.map((column) => {
                    const value = column.accessor ? row[column.accessor] : undefined;
                    const renderedValue = column.render
                      ? column.render(row, index)
                      : value == null
                        ? ""
                        : String(value);

                    return (
                      <td
                        key={column.key}
                        className={joinClasses("px-4 py-3 text-ink", column.cellClassName)}
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
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const interactionDisabled = disabled || loading;

  const changePage = (nextPage: number) => {
    if (!interactionDisabled && nextPage !== currentPage) onPageChange(nextPage);
  };

  return (
    <nav
      {...props}
      aria-label="Phân trang"
      aria-busy={loading || undefined}
      className={joinClasses("flex flex-wrap items-center justify-center gap-1.5", className)}
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
          <PageButton page={1} currentPage={currentPage} disabled={interactionDisabled} onClick={changePage} />
          {start > 2 && <span className="px-1 text-muted" aria-hidden="true">…</span>}
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
          {end < totalPages - 1 && <span className="px-1 text-muted" aria-hidden="true">…</span>}
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
