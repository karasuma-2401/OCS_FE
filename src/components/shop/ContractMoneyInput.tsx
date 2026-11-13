import type { ChangeEvent, KeyboardEvent } from 'react';

interface Props { value: number | null; onChange: (value: number | null) => void; className: string }

export function ContractMoneyInput({ value, onChange, className }: Props) {
  const update = (input: HTMLInputElement, text: string, digitsBeforeCaret: number) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 15);
    onChange(digits ? Number(digits) : null);
    requestAnimationFrame(() => {
      const formatted = input.value;
      let position = 0; let count = 0;
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
  return <input required type="text" inputMode="numeric" autoComplete="off" className={className} value={value === null ? '' : value.toLocaleString('vi-VN')} onChange={change} onKeyDown={keyDown} />;
}
