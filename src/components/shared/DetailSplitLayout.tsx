import type { ReactNode, RefObject } from 'react';
import { X } from 'lucide-react';

/** Shared list/detail layout used by the shop workspaces. */
export function DetailSplitLayout({ open, children }: { open: boolean; children: ReactNode }) {
  return <div className={'grid items-start gap-5 ' + (open ? 'lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]' : '')}>{children}</div>;
}

export function DetailPanel({ panelRef, title, description, onClose, disabled = false, className = '', children }: {
  panelRef: RefObject<HTMLElement | null>; title: string; description: ReactNode;
  onClose: () => void; disabled?: boolean; className?: string; children: ReactNode;
}) {
  return <aside ref={panelRef} tabIndex={-1} aria-label={title} className={`scroll-mt-4 rounded-card bg-white focus:outline-none lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-2rem)] lg:flex-col lg:overflow-hidden ${className}`}>
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div><h3 className="font-bold text-brand-ink">{title}</h3><p className="mt-1 text-xs text-text-secondary">{description}</p></div>
      <button type="button" disabled={disabled} aria-label={`Đóng ${title.toLocaleLowerCase('vi-VN')}`} onClick={onClose} className="rounded-control p-2 text-text-secondary hover:bg-surface-dashboard focus-visible:outline-2 focus-visible:outline-brand-highlight disabled:cursor-wait"><X size={18} aria-hidden="true" /></button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
      {children}
    </div>
  </aside>;
}