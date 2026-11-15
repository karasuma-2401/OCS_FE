import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';

interface Props {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  className?: string;
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  required?: boolean;
}

export function ContractMoneyInput({
  value,
  onChange,
  className,
  label,
  error,
  helperText,
  disabled = false,
  placeholder = '0',
  id,
  required = false,
}: Props) {
  const update = (input: HTMLInputElement, text: string, digitsBeforeCaret: number) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 15);
    onChange(digits ? Number(digits) : null);
    requestAnimationFrame(() => {
      const formatted = input.value;
      let position = 0;
      let count = 0;
      while (position < formatted.length && count < digitsBeforeCaret) {
        if (/[0-9]/.test(formatted[position])) count++;
        position++;
      }
      input.setSelectionRange(position, position);
    });
  };

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    update(input, input.value, input.value.slice(0, cursor).replace(/[^0-9]/g, '').length);
  };

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    if (start !== input.selectionEnd) return;
    if (event.key === 'Backspace' && start >= 2 && input.value[start - 1] === '.') {
      event.preventDefault();
      const before = input.value.slice(0, start - 2);
      update(input, before + input.value.slice(start), before.replace(/[^0-9]/g, '').length);
    } else if (event.key === 'Delete' && input.value[start] === '.' && start + 1 < input.value.length) {
      event.preventDefault();
      const before = input.value.slice(0, start);
      update(input, before + input.value.slice(start + 2), before.replace(/[^0-9]/g, '').length);
    }
  };

  const displayVal = value === null || value === undefined ? '' : value.toLocaleString('vi-VN');

  if (label || error || helperText) {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={Boolean(error) || undefined}
            className={
              className ||
              `w-full rounded-xl border bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-70 ${
                error
                  ? 'border-state-danger focus:border-state-danger focus:ring-state-danger/20'
                  : 'border-border focus:border-brand-pink-focus focus:ring-brand-pink/25'
              }`
            }
            value={displayVal}
            onChange={change}
            onKeyDown={keyDown}
          />
        </div>
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-muted">{helperText}</p>
        )}
        {error && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-state-danger">
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <input
      id={id}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      value={displayVal}
      onChange={change}
      onKeyDown={keyDown}
    />
  );
}
