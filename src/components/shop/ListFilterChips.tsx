import { RotateCcw, X } from 'lucide-react';

export interface ListFilterChip { id: string; label: string; onRemove: () => void }
export function ListFilterChips({ filters, onReset }: { filters: ListFilterChip[]; onReset: () => void }) {
  if (!filters.length) return null;
  return <div aria-label="Bộ lọc đang áp dụng" className="mt-3 flex flex-wrap items-center gap-2 animate-inv-fade-in">
    {filters.map(filter => <button key={filter.id} type="button" onClick={filter.onRemove} aria-label={`Xóa bộ lọc ${filter.label}`} className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-brand-pink/40 bg-white px-2.5 py-0.5 text-xs font-medium text-brand-ink transition hover:border-brand-pink hover:bg-brand-pink-surface focus-visible:outline-2 focus-visible:outline-brand-highlight"><span>{filter.label}</span><X size={12} aria-hidden="true" /></button>)}
    <button type="button" onClick={onReset} className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-brand-pink-surface px-2.5 py-0.5 text-xs font-semibold text-brand-highlight transition hover:bg-brand-pink-light focus-visible:outline-2 focus-visible:outline-brand-highlight"><RotateCcw size={12} aria-hidden="true" />Xóa tất cả</button>
  </div>;
}
