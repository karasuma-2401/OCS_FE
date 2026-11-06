import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? date : null;
}

export function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDisplayDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return parseDate(iso) ? iso : null;
}

function displayDate(value: string): string {
  const date = parseDate(value);
  return date ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` : '';
}

function moveMonth(date: Date, amount: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay));
}

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  ariaLabel?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  error?: ReactNode;
  helperText?: ReactNode;
  className?: string;
}

/** Controlled date field. Values passed to the caller and forms use YYYY-MM-DD. */
export function DatePicker({ value, onChange, label, ariaLabel, id, name, required = false, disabled = false, min, max, error, helperText, className = '' }: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const calendarId = `${inputId}-calendar`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const lastEmitted = useRef(value);
  const [draft, setDraft] = useState(() => displayDate(value));
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [activeDate, setActiveDate] = useState(() => parseDate(value) ?? new Date());
  const parsedDraft = parseDisplayDate(draft);
  const outOfRange = parsedDraft !== null && Boolean((min && parsedDraft < min) || (max && parsedDraft > max));

  useEffect(() => {
    if (value !== lastEmitted.current) setDraft(displayDate(value));
    lastEmitted.current = value;
  }, [value]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(draft && (!parsedDraft || outOfRange) ? 'Vui lòng nhập ngày hợp lệ trong khoảng cho phép (dd/mm/yyyy).' : '');
  }, [draft, parsedDraft, outOfRange]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  useEffect(() => { if (open) activeRef.current?.focus(); }, [open, activeDate]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  function emit(next: string) {
    lastEmitted.current = next;
    onChange(next);
  }

  function inRange(next: string) {
    return (!min || next >= min) && (!max || next <= max);
  }

  function clampDate(date: Date) {
    const dateValue = toDateValue(date);
    return (min && dateValue < min ? parseDate(min) : max && dateValue > max ? parseDate(max) : null) ?? date;
  }

  function selectDate(date: Date) {
    const next = toDateValue(date);
    if (!inRange(next)) return;
    setDraft(displayDate(next));
    emit(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openCalendar() {
    if (open) { setOpen(false); return; }
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (bounds) {
      setAbove(window.innerHeight - bounds.bottom < 350 && bounds.top > window.innerHeight - bounds.bottom);
      setAlignRight(bounds.left + 288 > window.innerWidth - 16);
    }
    setActiveDate(clampDate(parseDate(parsedDraft ?? value) ?? new Date()));
    setOpen(true);
  }

  function navigateDays(event: KeyboardEvent<HTMLDivElement>) {
    let next: Date | null = null;
    const day = activeDate.getDay();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key] ?? 0;
      next = new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate() + delta);
    } else if (event.key === 'Home' || event.key === 'End') {
      const offset = (day + 6) % 7;
      next = new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate() + (event.key === 'Home' ? -offset : 6 - offset));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      next = moveMonth(activeDate, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
    }
    if (next) { event.preventDefault(); setActiveDate(clampDate(next)); }
  }

  const monthStart = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1);
  const firstOffset = (monthStart.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) => new Date(monthStart.getFullYear(), monthStart.getMonth(), index - firstOffset + 1));
  const today = toDateValue(new Date());

  return <div ref={rootRef} className={`min-w-0 ${className}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }} onKeyDown={(event) => { if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); } }}>
    {label && <label htmlFor={inputId} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink">{label}</label>}
    <div className="relative">
      <div className={`flex items-center rounded-xl border bg-paper transition focus-within:ring-2 focus-within:ring-brand-pink/25 ${error ? 'border-state-danger' : 'border-border focus-within:border-brand-pink-focus'}`}>
        <input ref={inputRef} id={inputId} type="text" inputMode="numeric" placeholder="dd/mm/yyyy" value={draft} required={required} disabled={disabled} aria-label={ariaLabel} aria-invalid={Boolean(error) || undefined} aria-describedby={error || helperText ? descriptionId : undefined} onChange={(event) => {
          const nextDraft = event.target.value;
          const next = parseDisplayDate(nextDraft);
          event.currentTarget.setCustomValidity(nextDraft && (!next || !inRange(next)) ? 'Vui lòng nhập ngày hợp lệ trong khoảng cho phép (dd/mm/yyyy).' : '');
          setDraft(nextDraft);
          emit(next && inRange(next) ? next : '');
        }} className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-70" />
        <button ref={triggerRef} type="button" disabled={disabled} aria-label={label ? `Chọn ${typeof label === 'string' ? label.toLocaleLowerCase('vi-VN') : 'ngày'}` : 'Chọn ngày'} aria-expanded={open} aria-controls={open ? calendarId : undefined} onClick={openCalendar} className="mr-1.5 rounded-lg p-2 text-brand-highlight hover:bg-brand-pink-light focus-visible:outline-2 focus-visible:outline-brand-pink-focus disabled:cursor-not-allowed disabled:opacity-50"><CalendarDays size={18} aria-hidden="true" /></button>
      </div>
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      {open && <div id={calendarId} role="group" aria-label="Chọn ngày" aria-describedby={`${calendarId}-help`} className={`absolute z-[90] w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#ecdce2] bg-white p-3 shadow-xl ${above ? 'bottom-full mb-2' : 'top-full mt-2'} ${alignRight ? 'right-0' : 'left-0'}`}>
        <p id={`${calendarId}-help`} className="sr-only">Dùng phím mũi tên để di chuyển theo ngày, Page Up hoặc Page Down để đổi tháng, Escape để đóng lịch.</p>
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" aria-label="Tháng trước" onClick={() => setActiveDate(clampDate(moveMonth(activeDate, -1)))} className="rounded-lg p-2 text-brand-highlight hover:bg-brand-pink-surface focus-visible:outline-2 focus-visible:outline-brand-pink-focus"><ChevronLeft size={18} aria-hidden="true" /></button>
          <span className="text-sm font-bold capitalize text-brand-ink" aria-live="polite">{new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(activeDate)}</span>
          <button type="button" aria-label="Tháng sau" onClick={() => setActiveDate(clampDate(moveMonth(activeDate, 1)))} className="rounded-lg p-2 text-brand-highlight hover:bg-brand-pink-surface focus-visible:outline-2 focus-visible:outline-brand-pink-focus"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <div role="grid" aria-label="Lịch chọn ngày" onKeyDown={navigateDays}>
          <div role="row" className="grid grid-cols-7">{weekdays.map(day => <div role="columnheader" key={day} className="py-1 text-center text-[11px] font-bold text-muted">{day}</div>)}</div>
          {Array.from({ length: 6 }, (_, week) => <div role="row" key={week} className="grid grid-cols-7">{days.slice(week * 7, week * 7 + 7).map(day => {
            const dayValue = toDateValue(day);
            const selected = dayValue === value;
            const isActive = dayValue === toDateValue(activeDate);
            return <div role="gridcell" key={dayValue} aria-selected={selected} className="flex justify-center"><button ref={isActive ? activeRef : undefined} type="button" tabIndex={isActive ? 0 : -1} disabled={!inRange(dayValue)} aria-label={new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(day)} aria-current={dayValue === today ? 'date' : undefined} onClick={() => selectDate(day)} className={`my-0.5 size-8 rounded-full text-xs transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-pink-focus disabled:cursor-not-allowed disabled:opacity-30 ${selected ? 'bg-button-pastel font-bold text-brand-ink' : day.getMonth() !== monthStart.getMonth() ? 'text-gray-400 hover:bg-brand-pink-surface' : 'text-ink hover:bg-brand-pink-surface'} ${dayValue === today && !selected ? 'ring-1 ring-brand-pink-focus' : ''}`}>{day.getDate()}</button></div>;
          })}</div>)}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-[#f1e7eb] pt-2 text-xs font-semibold text-brand-highlight">
          <button type="button" onClick={() => { setDraft(''); emit(''); setOpen(false); triggerRef.current?.focus(); }} className="rounded-lg px-2 py-1.5 hover:bg-brand-pink-surface focus-visible:outline-2 focus-visible:outline-brand-pink-focus">Xóa</button>
          <button type="button" disabled={!inRange(today)} onClick={() => selectDate(new Date())} className="rounded-lg px-2 py-1.5 hover:bg-brand-pink-surface focus-visible:outline-2 focus-visible:outline-brand-pink-focus disabled:opacity-40">Hôm nay</button>
        </div>
      </div>}
    </div>
    {(error || helperText) && <p id={descriptionId} className={`mt-1.5 text-xs ${error ? 'text-state-danger' : 'text-muted'}`}>{error || helperText}</p>}
  </div>;
}
