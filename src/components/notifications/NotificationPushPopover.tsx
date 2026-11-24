import { useEffect, useRef, useState } from 'react';
import { BellOff, ChevronDown, Lock, Smartphone } from 'lucide-react';
import { Badge, Button } from '@/components/shared';
import type { NotificationCenterContextValue } from '@/context/NotificationContext';
import { formatNotificationRelativeTime } from './notificationMeta';

interface NotificationPushPopoverProps {
  fcm: NotificationCenterContextValue['fcm'] | undefined;
  toggling: boolean;
  onTogglePush: (enable: boolean) => Promise<void>;
}

export function NotificationPushPopover({
  fcm,
  toggling,
  onTogglePush,
}: NotificationPushPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!fcm) return null;

  const devices = fcm.status?.devices ?? [];
  const isBlocked = fcm.permission === 'denied';
  const isUnavailable =
    !fcm.isFirebaseClientConfigured || (Boolean(fcm.status) && !fcm.isServerConfigured);
  const canEnable = !fcm.isPushActive && !isBlocked && !isUnavailable;
  const canDisable = Boolean(fcm.isPushActive || fcm.fcmToken);

  const statusDotClass = fcm.isPushActive
    ? 'bg-state-success'
    : isBlocked || isUnavailable
      ? 'bg-state-warning'
      : 'bg-muted';

  const triggerLabel = fcm.isPushActive
    ? `Đang bật${fcm.status?.registeredDeviceCount ? ` (${fcm.status.registeredDeviceCount} thiết bị)` : ' thông báo'}`
    : isBlocked
      ? 'Đang bị chặn thông báo'
      : isUnavailable
        ? 'Chưa khả dụng'
        : 'Đang tắt trên thiết bị';

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
          open
            ? 'border-brand-highlight bg-brand-pink-surface text-brand-ink'
            : 'border-border bg-paper text-ink hover:border-brand-highlight/60 hover:bg-brand-pink-surface/50'
        }`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass}`} aria-hidden="true" />
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Cấu hình thông báo đẩy trên thiết bị"
          className="animate-inv-fade-in fixed inset-x-3 top-20 z-[130] rounded-2xl border border-border bg-paper p-4 shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80"
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                fcm.isPushActive
                  ? 'bg-state-success-muted text-state-success'
                  : isBlocked
                    ? 'bg-state-warning-muted text-state-warning'
                    : 'bg-brand-pink-surface text-brand-highlight'
              }`}
            >
              {isBlocked ? (
                <Lock size={17} aria-hidden="true" />
              ) : (
                <Smartphone size={18} aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-bold text-ink">Thông báo đẩy trình duyệt</h3>
                <Badge
                  variant={
                    fcm.isPushActive
                      ? 'success'
                      : isBlocked || isUnavailable
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {fcm.isPushActive
                    ? 'Đang bật'
                    : isBlocked
                      ? 'Bị chặn'
                      : isUnavailable
                        ? 'Chưa khả dụng'
                        : 'Đang tắt'}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {isBlocked
                  ? 'Hãy bấm biểu tượng ổ khóa trên thanh địa chỉ → Thông báo → Cho phép rồi tải lại trang.'
                  : 'Nhận thông báo thời gian thực ngay cả khi bạn chuyển sang tab khác.'}
              </p>
            </div>
          </div>

          {devices.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Thiết bị đã đăng ký ({devices.length})
              </p>
              <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                {devices.slice(0, 5).map((device, idx) => (
                  <div
                    key={`${device.deviceType}-${device.lastUsedAt}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-white px-2.5 py-1.5 text-xs"
                  >
                    <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                      <Smartphone size={12} className="text-brand-highlight" aria-hidden="true" />
                      {device.deviceType || 'Web'}
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatNotificationRelativeTime(device.lastUsedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fcm.error && (
            <p className="mt-2.5 text-xs font-medium text-state-danger">{fcm.error}</p>
          )}

          {(canEnable || canDisable) && (
            <div className="mt-3 flex justify-end gap-2 border-t border-border/60 pt-3">
              {canEnable && (
                <Button
                  size="sm"
                  className="w-full"
                  loading={Boolean(fcm.loading || toggling)}
                  onClick={() => void onTogglePush(true)}
                >
                  Bật thông báo đẩy
                </Button>
              )}
              {canDisable && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  loading={toggling}
                  startIcon={<BellOff size={13} aria-hidden="true" />}
                  onClick={() => void onTogglePush(false)}
                >
                  Tắt trên thiết bị này
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
