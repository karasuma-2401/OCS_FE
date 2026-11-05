import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name when no visible label is provided. */
  ariaLabel?: string;
  label?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  error?: ReactNode;
  helperText?: ReactNode;
  className?: string;
}

/** A controlled, select-only combobox with keyboard and form support. */
export function Combobox({ options, value, onChange, ariaLabel, label, placeholder = 'Chọn một mục', disabled = false, name, id, error, helperText, className }: ComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-list`;
  const descriptionId = `${inputId}-description`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listId]);

  function enabledFrom(start: number, direction: 1 | -1) {
    if (!options.length) return -1;
    for (let offset = 0; offset < options.length; offset++) {
      const index = (start + direction * offset + options.length * 2) % options.length;
      if (!options[index].disabled) return index;
    }
    return -1;
  }

  function showMenu() {
    const initial = selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : enabledFrom(0, 1);
    setActive(initial);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) { showMenu(); return; }
      setActive(enabledFrom(active < 0 ? (direction === 1 ? 0 : options.length - 1) : active + direction, direction));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!open) setOpen(true);
      setActive(enabledFrom(event.key === 'Home' ? 0 : options.length - 1, event.key === 'Home' ? 1 : -1));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(active); else showMenu();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const prefix = `${searchRef.current}${event.key}`.toLocaleLowerCase('vi-VN');
      searchRef.current = prefix;
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => { searchRef.current = ''; }, 700);
      const index = options.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase('vi-VN').startsWith(prefix));
      if (index >= 0) { setActive(index); setOpen(true); }
    }
  }

  return (
    <div ref={rootRef} className={className} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      {label && <label htmlFor={inputId} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink">{label}</label>}
      <div className="relative">
        <button
          ref={buttonRef}
          id={inputId}
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 && active < options.length ? `${listId}-option-${active}` : undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || helperText ? descriptionId : undefined}
          disabled={disabled}
          onClick={() => { if (open) setOpen(false); else showMenu(); }}
          onKeyDown={onKeyDown}
          className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border bg-paper px-3.5 py-2.5 text-left text-sm text-ink outline-none transition focus-visible:ring-2 focus-visible:ring-brand-pink/40 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-70 ${error ? 'border-state-danger' : open ? 'border-brand-pink-focus' : 'border-border hover:border-brand-pink-focus'}`}
        >
          <span className={selected ? 'min-w-0 truncate' : 'min-w-0 truncate text-muted'}>{selected?.label ?? placeholder}</span>
          <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
        {open && <ul id={listId} role="listbox" aria-label={ariaLabel} aria-labelledby={ariaLabel ? undefined : inputId} className="absolute z-[80] mt-1.5 max-h-60 w-full min-w-44 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-paper p-1.5 shadow-lg">
          {options.length === 0 && <li className="px-3 py-2 text-sm text-muted">Không có lựa chọn</li>}
          {options.map((option, index) => <li
            id={`${listId}-option-${index}`}
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            aria-disabled={option.disabled || undefined}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => { if (!option.disabled) setActive(index); }}
            onClick={() => choose(index)}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${option.disabled ? 'cursor-not-allowed text-muted/50' : `cursor-pointer ${active === index ? 'bg-brand-pink-surface text-brand-highlight' : 'text-ink'}`}`}
          ><span>{option.label}</span>{option.value === value && <Check size={16} className="shrink-0 text-brand-highlight" aria-hidden="true" />}</li>)}
        </ul>}
      </div>
      {(error || helperText) && <p id={descriptionId} className={`mt-1.5 text-xs ${error ? 'text-state-danger' : 'text-muted'}`}>{error || helperText}</p>}
    </div>
  );
}
