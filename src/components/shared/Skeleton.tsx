import type { HTMLAttributes } from 'react';

/** Decorative building block; the containing loading state supplies its accessible label. */
export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} aria-hidden="true" className={`animate-pulse rounded-lg bg-[#f1e4e9] motion-reduce:animate-none ${className}`} />;
}

type SkeletonVariant = 'table' | 'cards' | 'list' | 'detail' | 'page' | 'slots' | 'products' | 'permissions' | 'rail';

export interface SkeletonLoadingProps {
  variant?: SkeletonVariant;
  label?: string;
  count?: number;
  columns?: number;
  className?: string;
}

/** Layout-aware placeholder for content that is being fetched. */
export function SkeletonLoading({ variant = 'list', label = 'Đang tải dữ liệu...', count, columns = 4, className = '' }: SkeletonLoadingProps) {
  const items = Array.from({ length: count ?? (variant === 'products' ? 3 : variant === 'slots' ? 6 : 4) });
  const tableColumns = Array.from({ length: Math.max(1, columns) });
  const tableGrid = { gridTemplateColumns: `repeat(${tableColumns.length}, minmax(0, 1fr))` };
  const lines = <div className="space-y-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>;

  return <div role="status" aria-live="polite" aria-busy="true" className={className}>
    <span className="sr-only">{label}</span>
    {variant === 'table' && <div className="space-y-3" aria-hidden="true">
      <div className="grid gap-4 border-b border-border pb-3" style={tableGrid}>{tableColumns.map((_, i) => <Skeleton key={i} className="h-3 w-3/4" />)}</div>
      {items.map((_, i) => <div key={i} className="grid gap-4 border-b border-border/50 py-3" style={tableGrid}>{tableColumns.map((_, column) => <Skeleton key={column} className="h-4 w-3/4" />)}</div>)}
    </div>}
    {variant === 'list' && <div className="space-y-3" aria-hidden="true">{items.map((_, i) => <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 p-3"><Skeleton className="size-10 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-4/5" /></div></div>)}</div>}
    {variant === 'cards' && <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">{items.map((_, i) => <div key={i} className="space-y-5 rounded-2xl border border-border bg-paper p-5"><div className="flex justify-between gap-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-20 rounded-full" /></div>{lines}<Skeleton className="h-9 w-28" /></div>)}</div>}
    {variant === 'slots' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-hidden="true">{items.map((_, i) => <Skeleton key={i} className="h-[68px] rounded-2xl" />)}</div>}
    {variant === 'products' && <div className="catalog-grid grid grid-cols-3 gap-[1.15rem] max-[850px]:grid-cols-2 max-[600px]:gap-[.65rem]" aria-hidden="true">{items.map((_, i) => <div key={i} className="space-y-3"><Skeleton className="aspect-[3/4] w-full rounded-xl" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/5" /></div>)}</div>}
    {variant === 'detail' && <div className="grid gap-5 sm:grid-cols-2" aria-hidden="true"><Skeleton className="h-60 w-full" /><div className="space-y-5">{lines}<Skeleton className="h-9 w-1/2" /></div></div>}
    {variant === 'page' && <div className="mx-auto max-w-6xl space-y-6" aria-hidden="true"><Skeleton className="h-10 w-40" /><Skeleton className="h-8 w-2/5" /><Skeleton className="h-4 w-3/5" /><div className="grid gap-4 md:grid-cols-2">{items.slice(0, 2).map((_, i) => <div key={i} className="space-y-5 rounded-2xl border border-border p-6">{lines}<Skeleton className="h-24 w-full" /></div>)}</div></div>}
    {variant === 'permissions' && <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]" aria-hidden="true"><div className="space-y-4 rounded-2xl border border-border bg-paper p-5"><Skeleton className="h-5 w-1/2" />{items.map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div><div className="space-y-5 rounded-2xl border border-border bg-paper p-5">{lines}{items.map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div></div>}
    {variant === 'rail' && <div className="space-y-5" aria-hidden="true"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-80 w-full rounded-3xl" /></div>}
  </div>;
}
