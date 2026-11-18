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
  borderAccentClass: string;
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
    iconBgClass: 'bg-state-info-muted text-state-info-icon',
    iconTextClass: 'text-state-info-icon',
    borderAccentClass: 'border-l-state-info-icon',
    renderIcon: (size = 16) => <CalendarClock size={size} aria-hidden="true" />,
  },
  Consignment: {
    key: 'Consignment',
    label: 'Ký gửi',
    badgeVariant: 'success',
    toastVariant: 'success',
    iconBgClass: 'bg-state-success-muted text-state-success-icon',
    iconTextClass: 'text-state-success-icon',
    borderAccentClass: 'border-l-state-success-icon',
    renderIcon: (size = 16) => <FileText size={size} aria-hidden="true" />,
  },
  Buyout: {
    key: 'Buyout',
    label: 'Thu mua',
    badgeVariant: 'warning',
    toastVariant: 'warning',
    iconBgClass: 'bg-state-warning-muted text-state-warning-icon',
    iconTextClass: 'text-state-warning-icon',
    borderAccentClass: 'border-l-state-warning-icon',
    renderIcon: (size = 16) => <ShoppingBag size={size} aria-hidden="true" />,
  },
  Payment: {
    key: 'Payment',
    label: 'Thanh toán',
    badgeVariant: 'success',
    toastVariant: 'success',
    iconBgClass: 'bg-emerald-100 text-emerald-700',
    iconTextClass: 'text-emerald-700',
    borderAccentClass: 'border-l-emerald-600',
    renderIcon: (size = 16) => <CreditCard size={size} aria-hidden="true" />,
  },
  Promotion: {
    key: 'Promotion',
    label: 'Ưu đãi',
    badgeVariant: 'info',
    toastVariant: 'brand',
    iconBgClass: 'bg-brand-pink-light text-brand-highlight',
    iconTextClass: 'text-brand-highlight',
    borderAccentClass: 'border-l-brand-pink',
    renderIcon: (size = 16) => <Sparkles size={size} aria-hidden="true" />,
  },
  System: {
    key: 'System',
    label: 'Hệ thống',
    badgeVariant: 'neutral',
    toastVariant: 'info',
    iconBgClass: 'bg-state-neutral-soft text-state-neutral',
    iconTextClass: 'text-state-neutral-icon',
    borderAccentClass: 'border-l-border-dark',
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
