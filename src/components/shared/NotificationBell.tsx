import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, Info } from 'lucide-react';
import { notificationApi } from '@/api/notificationApi';
import type { Notification } from '@/types';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getMyNotifications(20);
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch {
      // Ignored if unauthenticated or offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling update every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // fallback
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // fallback
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-paper text-ink transition hover:border-accent hover:bg-surface-subtle"
        title="Thông báo"
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-state-danger px-1 text-[11px] font-bold text-white shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-paper p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink">Thông báo hệ thống</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-state-danger/10 px-2 py-0.5 text-xs font-semibold text-state-danger">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-accent-dark hover:underline flex items-center gap-1"
              >
                <Check size={13} /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto space-y-2.5 divide-y divide-border/50">
            {loading && notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">Đang tải thông báo...</p>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                <Info size={28} className="mx-auto mb-2 text-muted/60" />
                Chưa có thông báo nào.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  className={`pt-2.5 first:pt-0 cursor-pointer rounded-lg p-2 transition ${
                    n.isRead ? 'opacity-70 hover:opacity-100 hover:bg-surface/50' : 'bg-brand-pink-surface/80 hover:bg-brand-pink-light/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-semibold ${n.isRead ? 'text-ink' : 'text-brand-highlight font-bold'}`}>
                      {n.title}
                    </p>
                    <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted">
                      <Clock size={11} />
                      {new Date(n.sentAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                    {n.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

