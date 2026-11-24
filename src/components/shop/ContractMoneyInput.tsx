import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';

export const MAX_RECEPTION_PRICE = 999_999_999_999;
export function validReceptionPrice(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_RECEPTION_PRICE;
}

export function normalizeDecimalMoney(raw: string): string {
  const cleaned = raw.replace(/\./g, '').replace(/[^\d,]/g, '');
  const commaIdx = cleaned.indexOf(',');
  const rawWhole = commaIdx >= 0 ? cleaned.slice(0, commaIdx) : cleaned;
  const rawFrac = commaIdx >= 0 ? cleaned.slice(commaIdx + 1).replace(/,/g, '').slice(0, 2) : null;
  const whole = rawWhole.slice(0, 15).replace(/^0+(?=\d)/, '');
  if (rawFrac === null) return whole;
  return `${whole || '0'},${rawFrac}`;
}

export function formatDecimalMoney(normalized: string): string {
  if (!normalized) return '';
  const [whole, frac] = normalized.split(',');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return frac === undefined ? grouped : `${grouped},${frac}`;
}

export function parseDecimalMoney(normalized: string): number | null {
  if (!normalized) return null;
  const parsed = Number(normalized.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function toDecimalMoneyInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return String(value).replace('.', ',');
}

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

interface DecimalProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  required?: boolean;
}

const restoreCaret = (input: HTMLInputElement, tokensBeforeCaret: number, pattern: RegExp) => {
  requestAnimationFrame(() => {
    const formatted = input.value;
    let position = 0;
    let count = 0;
    while (position < formatted.length && count < tokensBeforeCaret) {
      if (pattern.test(formatted[position])) count++;
      position++;
    }
    input.setSelectionRange(position, position);
  });
};

const defaultInputClass = (error?: ReactNode) =>
  `w-full rounded-xl border bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-70 ${
    error
      ? 'border-state-danger focus:border-state-danger focus:ring-state-danger/20'
      : 'border-border focus:border-brand-pink-focus focus:ring-brand-pink/25'
  }`;

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
    restoreCaret(input, digitsBeforeCaret, /[0-9]/);
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
            className={className || defaultInputClass(error)}
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

export function DecimalMoneyInput({
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
}: DecimalProps) {
  const update = (input: HTMLInputElement, text: string, tokensBeforeCaret: number) => {
    onChange(normalizeDecimalMoney(text));
    restoreCaret(input, tokensBeforeCaret, /[0-9,]/);
  };

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    update(input, input.value, input.value.slice(0, cursor).replace(/[^0-9,]/g, '').length);
  };

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    if (start !== input.selectionEnd) return;
    if (event.key === 'Backspace' && start >= 2 && input.value[start - 1] === '.') {
      event.preventDefault();
      const before = input.value.slice(0, start - 2);
      update(input, before + input.value.slice(start), before.replace(/[^0-9,]/g, '').length);
    } else if (event.key === 'Delete' && input.value[start] === '.' && start + 1 < input.value.length) {
      event.preventDefault();
      const before = input.value.slice(0, start);
      update(input, before + input.value.slice(start + 2), before.replace(/[^0-9,]/g, '').length);
    }
  };

  const displayVal = formatDecimalMoney(value);

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
      <input
        id={id}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={Boolean(error) || undefined}
        className={className || defaultInputClass(error)}
        value={displayVal}
        onChange={change}
        onKeyDown={keyDown}
      />
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
