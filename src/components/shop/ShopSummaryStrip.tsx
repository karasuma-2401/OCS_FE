import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, Skeleton } from "@/components/shared";

export interface ShopSummaryCard<T extends string = string> {
  id: T;
  label: string;
  value: number | undefined;
  formatValue?: (value: number) => string;
  hint: string;
  icon: LucideIcon;
  tone: string;
}
interface ShopSummaryStripProps<T extends string> {
  cards: ShopSummaryCard<T>[];
  loading: boolean;
  activeQuickFilter: T | null;
  onSelectQuickFilter: (filter: T) => void;
  ariaLabel: string;
  loadingLabel: string;
  gridClassName?: string;
}

function useAnimatedNumber(target: number | undefined, durationMs = 520) {
  const [display, setDisplay] = useState<number | undefined>(
    target === undefined ? undefined : 0,
  );
  const currentRef = useRef<number>(0);

  useEffect(() => {
    if (target === undefined) {
      currentRef.current = 0;
      setDisplay(undefined);
      return;
    }
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    const startValue = currentRef.current;
    if (startValue === target) {
      setDisplay(target);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const next = Math.round(startValue + (target - startValue) * eased);
      currentRef.current = next;
      setDisplay(next);
      if (elapsed < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        currentRef.current = target;
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return display;
}

function KpiCounter({
  value,
  formatValue,
}: {
  value: number | undefined;
  formatValue?: (value: number) => string;
}) {
  const animated = useAnimatedNumber(value);
  return (
    <p className="mt-1.5 text-2xl font-bold tabular-nums text-brand-ink">
      {animated !== undefined
        ? formatValue
          ? formatValue(animated)
          : animated.toLocaleString("vi-VN")
        : "—"}
    </p>
  );
}

export function ShopSummaryStrip<T extends string>({
  cards,
  ariaLabel,
  loadingLabel,
  gridClassName = "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
  loading,
  activeQuickFilter,
  onSelectQuickFilter,
}: ShopSummaryStripProps<T>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }>({ x: 0, y: 0, width: 0, height: 0, visible: false });

  const updateIndicator = useCallback(() => {
    if (!activeQuickFilter) {
      setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }
    const el = cardRefs.current[activeQuickFilter];
    if (!el) {
      setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }
    setIndicator({
      x: el.offsetLeft,
      y: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight,
      visible: true,
    });
  }, [activeQuickFilter]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, cards]);

  useEffect(() => {
    const container = gridRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      updateIndicator();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateIndicator]);

  return (
    <div
      ref={gridRef}
      className={`relative grid gap-3 ${gridClassName}`}
      aria-busy={loading}
      aria-label={ariaLabel}
    >
      {/* Viền trượt mượt theo thẻ KPI đang chọn */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 rounded-2xl border border-brand-highlight/60 bg-brand-pink-surface/25 shadow-xs transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] will-change-[transform,width,height] motion-reduce:transition-none"
        style={{
          width: `${indicator.width}px`,
          height: `${indicator.height}px`,
          transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
          opacity: indicator.visible ? 1 : 0,
        }}
      />

      {loading && (
        <span className="sr-only" role="status">
          {loadingLabel}
        </span>
      )}
      {cards.map((card, index) => {
        const Icon = card.icon;
        const active = activeQuickFilter === card.id;
        return (
          <button
            key={card.id}
            ref={(node) => {
              cardRefs.current[card.id] = node;
            }}
            type="button"
            aria-pressed={active}
            onClick={() => onSelectQuickFilter(card.id)}
            style={{ animationDelay: `${index * 45}ms` }}
            className="animate-inv-fade-in group relative cursor-pointer rounded-2xl text-left transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink-focus motion-reduce:transition-none"
          >
            <Card
              className={`h-full !p-4 transition-all duration-200 ${
                active
                  ? "!border-transparent !bg-white shadow-xs"
                  : "!bg-white hover:!border-brand-pink-focus hover:-translate-y-1 hover:shadow-md"
              }`}
            >
              {loading && card.value === undefined ? (
                <>
                  <Skeleton className="h-4 w-24 max-w-full" />
                  <div className="mt-2 flex h-7 items-center">
                    <Skeleton className="h-6 w-12 rounded-md" />
                  </div>
                  <Skeleton className="mt-2 h-3 w-28 max-w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-text-secondary">
                      {card.label}
                    </span>
                    <span
                      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none ${card.tone}`}
                    >
                      <Icon size={15} aria-hidden="true" />
                    </span>
                  </div>
                  <KpiCounter value={card.value} formatValue={card.formatValue} />
                  <p className="mt-1 truncate text-[11px] text-muted">
                    {card.hint}
                  </p>
                </>
              )}
            </Card>
          </button>
        );
      })}
    </div>
  );
}
