import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { InlineError } from "./InlineError";
import { Loading } from "./Loading";
import { joinClasses } from "./joinClasses";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  error?: ReactNode;
  loading?: boolean;
  loadingFallback?: ReactNode;
  disabled?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
  appearance?: "default" | "simple";
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
  loadingFallback,
  disabled = false,
  closeOnBackdrop = true,
  className,
  appearance = "default",
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
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const getFocusableElements = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter(
        (element) => !element.matches(":disabled") && element.tabIndex >= 0,
      );

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
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
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
      className={joinClasses("fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-ink/50 p-4", appearance === "default" && "backdrop-blur-sm")}
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
          "my-auto w-full max-w-lg rounded-2xl bg-paper shadow-2xl",
          appearance === "default" && "border border-brand-lavender/50",
          className,
        )}
      >
        <header className={joinClasses("relative flex items-start justify-between gap-4 overflow-hidden rounded-t-[15px] border-b px-5 py-4 sm:px-6", appearance === "default" ? "border-brand-lavender/30 bg-brand-pink-surface" : "border-border bg-paper")}>
          {appearance === "default" && <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={{
              background:
                "linear-gradient(90deg, var(--color-brand-pink-gradient), var(--color-brand-lavender-gradient) 52%, var(--color-brand-blue-gradient))",
            }}
          />}
          <div>
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </p>
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
        <fieldset disabled={closeDisabled} className="min-w-0 border-0 p-0">
          <div className="px-5 py-5 sm:px-6">
            {loading ? (loadingFallback ?? <Loading />) : children}
          </div>
        </fieldset>
        {footer && (
          <fieldset disabled={closeDisabled} className="min-w-0 border-0 p-0">
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
