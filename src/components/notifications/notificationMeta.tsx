import type { ReactNode } from 'react';
import {
  CalendarClock,
  CreditCard,
  FileText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { Notification, NotificationCategory } from '@/types';
import type { BadgeVariant } from '@/components/shared/Badge';
import type { ToastVariant } from '@/components/shared/Toast';

export interface NotificationCategoryMeta {
  key: NotificationCategory;
  label: string;
  badgeVariant: BadgeVariant;
  toastVariant: ToastVariant;
  iconBgClass: string;
  iconTextClass: string;
  renderIcon: (size?: number) => ReactNode;
}

export const NOTIFICATION_CATEGORIES: Record<
  NotificationCategory,
  NotificationCategoryMeta
> = {
  Appointment: {
    key: 'Appointment',
    label: 'Lịch hẹn',
    badgeVariant: 'info',
    toastVariant: 'info',
    iconBgClass: 'bg-state-info-muted text-state-info',
    iconTextClass: 'text-state-info',
    renderIcon: (size = 16) => <CalendarClock size={size} aria-hidden="true" />,
  },
  Consignment: {
    key: 'Consignment',
    label: 'Ký gửi',
    badgeVariant: 'success',
    toastVariant: 'success',
    iconBgClass: 'bg-state-success-muted text-state-success',
    iconTextClass: 'text-state-success',
    renderIcon: (size = 16) => <FileText size={size} aria-hidden="true" />,
  },
  Buyout: {
    key: 'Buyout',
    label: 'Thu mua',
    badgeVariant: 'warning',
    toastVariant: 'warning',
    iconBgClass: 'bg-state-warning-muted text-state-warning',
    iconTextClass: 'text-state-warning',
    renderIcon: (size = 16) => <ShoppingBag size={size} aria-hidden="true" />,
  },
  Payment: {
    key: 'Payment',
    label: 'Thanh toán',
    badgeVariant: 'payment',
    toastVariant: 'success',
    iconBgClass: 'bg-state-payment-muted text-state-payment',
    iconTextClass: 'text-state-payment',
    renderIcon: (size = 16) => <CreditCard size={size} aria-hidden="true" />,
  },
  Promotion: {
    key: 'Promotion',
    label: 'Ưu đãi',
    badgeVariant: 'brand',
    toastVariant: 'brand',
    iconBgClass: 'bg-brand-pink-light text-brand-highlight',
    iconTextClass: 'text-brand-highlight',
    renderIcon: (size = 16) => <Sparkles size={size} aria-hidden="true" />,
  },
  System: {
    key: 'System',
    label: 'Hệ thống',
    badgeVariant: 'neutral',
    toastVariant: 'info',
    iconBgClass: 'bg-state-neutral-soft text-state-neutral',
    iconTextClass: 'text-state-neutral',
    renderIcon: (size = 16) => <ShieldCheck size={size} aria-hidden="true" />,
  },
};

export const NOTIFICATION_FILTER_TABS: Array<{
  key: 'ALL' | NotificationCategory;
  label: string;
}> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'Appointment', label: 'Lịch hẹn' },
  { key: 'Consignment', label: 'Ký gửi' },
  { key: 'Buyout', label: 'Thu mua' },
  { key: 'Payment', label: 'Thanh toán' },
  { key: 'Promotion', label: 'Ưu đãi' },
  { key: 'System', label: 'Hệ thống' },
];

export function resolveNotificationCategory(
  notification: Pick<Notification, 'category' | 'type' | 'title' | 'content'>,
): NotificationCategory {
  const rawCat = notification.category?.toString().trim();
  if (rawCat && rawCat in NOTIFICATION_CATEGORIES) {
    return rawCat as NotificationCategory;
  }

  const combined = `${notification.title ?? ''} ${notification.content ?? ''}`.toLowerCase();

  if (
    notification.type === 2 ||
    notification.type === 'Promotion' ||
    combined.includes('ưu đãi') ||
    combined.includes('khuyến mãi')
  ) {
    return 'Promotion';
  }
  if (combined.includes('thu mua') || combined.includes('buyout')) {
    return 'Buyout';
  }
  if (
    combined.includes('thanh toán') ||
    combined.includes('giải ngân') ||
    combined.includes('quyết toán') ||
    combined.includes('vietqr') ||
    combined.includes('hóa đơn')
  ) {
    return 'Payment';
  }
  if (
    combined.includes('lịch hẹn') ||
    combined.includes('đặt lịch') ||
    combined.includes('khung giờ') ||
    combined.includes('có mặt tại quầy')
  ) {
    return 'Appointment';
  }
  if (
    combined.includes('ký gửi') ||
    combined.includes('hợp đồng') ||
    combined.includes('tiếp nhận')
  ) {
    return 'Consignment';
  }

  return 'System';
}

export function getNotificationCategoryMeta(
  notification: Pick<Notification, 'category' | 'type' | 'title' | 'content'>,
): NotificationCategoryMeta {
  const category = resolveNotificationCategory(notification);
  return NOTIFICATION_CATEGORIES[category] ?? NOTIFICATION_CATEGORIES.System;
}

export function resolveNotificationTargetLink(
  notification: Pick<Notification, 'link' | 'category' | 'type' | 'title' | 'content'>,
  isStaffOrAdmin: boolean,
): string {
  const category = resolveNotificationCategory(notification);

  if (isStaffOrAdmin) {
    if (notification.link && notification.link.startsWith('/shop')) {
      return notification.link;
    }
    switch (category) {
      case 'Buyout':
        return '/shop/buyout';
      case 'Payment':
        return '/shop/settlement';
      case 'Appointment':
      case 'Consignment':
        return '/shop/consignment';
      default:
        return '/shop/notifications';
    }
  }

  if (notification.link && !notification.link.startsWith('/shop')) {
    return notification.link;
  }

  switch (category) {
    case 'Appointment':
      return '/appointments';
    case 'Consignment':
    case 'Buyout':
    case 'Payment':
      return '/my-consignments';
    case 'Promotion':
      return '/catalog';
    default:
      return '/notifications';
  }
}

export function formatNotificationRelativeTime(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 45) return 'Vừa xong';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24 && now.toDateString() === date.toDateString()) {
    return `${diffHours} giờ trước`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const timeStr = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (yesterday.toDateString() === date.toDateString()) {
    return `Hôm qua, ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
  return `${dateStr}, ${timeStr}`;
}

export interface NotificationTimeGroup<T extends Pick<Notification, 'sentAt'> = Notification> {
  key: 'today' | 'yesterday' | 'this_week' | 'earlier';
  label: string;
  items: T[];
}

export function groupNotificationsByTime<T extends Pick<Notification, 'sentAt'>>(
  items: T[],
): NotificationTimeGroup<T>[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const buckets: Record<NotificationTimeGroup<T>['key'], T[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    earlier: [],
  };

  for (const item of items) {
    const time = new Date(item.sentAt).getTime();
    if (Number.isNaN(time) || time >= startOfToday) {
      buckets.today.push(item);
    } else if (time >= startOfYesterday) {
      buckets.yesterday.push(item);
    } else if (time >= startOfWeek) {
      buckets.this_week.push(item);
    } else {
      buckets.earlier.push(item);
    }
  }

  const ordered: Array<{ key: NotificationTimeGroup<T>['key']; label: string }> = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: 'this_week', label: 'Tuần này' },
    { key: 'earlier', label: 'Trước đó' },
  ];

  return ordered
    .filter(({ key }) => buckets[key].length > 0)
    .map(({ key, label }) => ({ key, label, items: buckets[key] }));
}

export function extractNotificationHighlights(text: string): string[] {
  if (!text) return [];
  const matches = new Set<string>();

  // Extract contract / appointment / buyout reference codes (e.g. #CN-2026-089, APT-20260101-001)
  const codeRegex = /#?[A-Z]{2,5}-\d{2,8}(?:-[A-Z0-9]{1,6})?/g;
  for (const m of text.matchAll(codeRegex)) {
    matches.add(m[0].startsWith('#') ? m[0] : `#${m[0]}`);
    if (matches.size >= 3) break;
  }

  // Extract VND amounts (e.g. 1.250.000đ, 850,000 VND)
  if (matches.size < 3) {
    const moneyRegex = /\d{1,3}(?:[.,]\d{3})+(?:\s?(?:đ|₫|VND))(?![\p{L}\p{N}])/giu;
    for (const m of text.matchAll(moneyRegex)) {
      matches.add(m[0].trim());
      if (matches.size >= 3) break;
    }
  }

  return Array.from(matches);
}

