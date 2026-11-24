import { useEffect, useRef } from "react";
import { Check, Minus } from "lucide-react";

export interface InventoryCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

/** Accessible animated checkbox aligned with OCS brand styling. */
export function InventoryCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  disabled = false,
  className = "",
}: InventoryCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const active = checked || indeterminate;
  return (
    <label
      className={`group relative inline-flex size-5 cursor-pointer items-center justify-center rounded-[6px] border transition-all duration-150 select-none focus-within:ring-2 focus-within:ring-brand-pink-focus focus-within:ring-offset-1 ${
        disabled
          ? "cursor-not-allowed opacity-45"
          : active
            ? "border-brand-highlight bg-brand-highlight text-white active:scale-90"
            : "border-border bg-white hover:border-brand-highlight hover:bg-brand-pink-surface active:scale-90"
      } ${className}`}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className="absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        aria-checked={indeterminate ? "mixed" : checked}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
      />
      {checked && (
        <Check
          size={13}
          strokeWidth={3}
          aria-hidden="true"
          className="pointer-events-none animate-inv-pop text-white"
        />
      )}
      {indeterminate && !checked && (
        <Minus
          size={13}
          strokeWidth={3}
          aria-hidden="true"
          className="pointer-events-none animate-inv-pop text-white"
        />
      )}
    </label>
  );
}
