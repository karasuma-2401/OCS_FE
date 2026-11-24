import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BellRing, CalendarClock, Clock, CreditCard } from 'lucide-react';
import { Card } from '@/components/shared';

export type NotificationSummaryFilter = 'today_unread' | 'unread' | 'ops' | 'finance';

interface NotificationSummaryStripProps {
  todayUnreadCount: number;
  unreadCount: number;
  opsCount: number;
  financeCount: number;
  activeFilter: NotificationSummaryFilter | null;
  onSelectFilter: (filter: NotificationSummaryFilter) => void;
}

function useAnimatedCounter(target: number, durationMs = 450) {
  const [display, setDisplay] = useState<number>(target);
  const currentRef = useRef<number>(target);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || currentRef.current === target) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    const startValue = currentRef.current;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startValue + (target - startValue) * eased);
      currentRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        currentRef.current = target;
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return display;
}

function AnimatedMetricValue({ value }: { value: number }) {
  const animated = useAnimatedCounter(value);
  return (
    <p className="mt-1.5 text-2xl font-bold tabular-nums text-brand-ink">
      {animated.toLocaleString('vi-VN')}
    </p>
  );
}

export function NotificationSummaryStrip({
  todayUnreadCount,
  unreadCount,
  opsCount,
  financeCount,
  activeFilter,
  onSelectFilter,
}: NotificationSummaryStripProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Partial<Record<NotificationSummaryFilter, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }>({ x: 0, y: 0, width: 0, height: 0, visible: false });

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!activeFilter) {
        setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }
      const grid = gridRef.current;
      const target = cardRefs.current[activeFilter];
      if (!grid || !target) return;
      setIndicator({
        x: target.offsetLeft,
        y: target.offsetTop,
        width: target.offsetWidth,
        height: target.offsetHeight,
        visible: true,
      });
    };

    updatePosition();
    if (typeof ResizeObserver === 'undefined' || !gridRef.current) return;
    const observer = new ResizeObserver(updatePosition);
    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [activeFilter]);

  const items: Array<{
    key: NotificationSummaryFilter;
    label: string;
    caption: string;
    value: number;
    icon: typeof Clock;
    iconClass: string;
  }> = [
    {
      key: 'today_unread',
      label: 'Cần chú ý hôm nay',
      caption: 'Tin chưa đọc phát sinh hôm nay',
      value: todayUnreadCount,
      icon: Clock,
      iconClass: 'bg-brand-pink-light text-brand-highlight',
    },
    {
      key: 'unread',
      label: 'Tổng chưa đọc',
      caption: 'Thông báo đang chờ xử lý',
      value: unreadCount,
      icon: BellRing,
      iconClass: 'bg-state-warning-muted text-state-warning',
    },
    {
      key: 'ops',
      label: 'Lịch hẹn & Ký gửi',
      caption: 'Slot hẹn và hợp đồng tiếp nhận',
      value: opsCount,
      icon: CalendarClock,
      iconClass: 'bg-state-info-muted text-state-info',
    },
    {
      key: 'finance',
      label: 'Thu mua & Thanh toán',
      caption: 'Phiếu thu mua và quyết toán',
      value: financeCount,
      icon: CreditCard,
      iconClass: 'bg-state-payment-muted text-state-payment',
    },
  ];

  return (
    <div ref={gridRef} className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {indicator.visible && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-10 rounded-card border-[1.5px] border-brand-highlight transition-all duration-250 ease-out motion-reduce:transition-none"
          style={{
            transform: `translate(${indicator.x}px, ${indicator.y}px)`,
            width: `${indicator.width}px`,
            height: `${indicator.height}px`,
          }}
        />
      )}

      {items.map((item) => {
        const Icon = item.icon;
        const selected = activeFilter === item.key;

        return (
          <button
            key={item.key}
            ref={(el) => {
              cardRefs.current[item.key] = el;
            }}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelectFilter(item.key)}
            className="group relative cursor-pointer select-none rounded-card text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
          >
            <Card
              className={`h-full transition-colors duration-200 ${
                selected
                  ? 'bg-brand-pink-surface/70'
                  : 'hover:bg-brand-pink-surface/35'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-text-secondary">
                  {item.label}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}
                >
                  <Icon size={16} aria-hidden="true" />
                </span>
              </div>
              <AnimatedMetricValue value={item.value} />
              <p className="mt-1 line-clamp-1 text-xs text-muted">{item.caption}</p>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
