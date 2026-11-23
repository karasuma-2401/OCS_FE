import React, { useState } from 'react';
import { QrCode, Store } from 'lucide-react';
import { Card } from '@/components/shared';
import { PosCartWorkspace } from './PosCartWorkspace';
import { PosVietQrWorkspace } from './PosVietQrWorkspace';

export type PosSubTab = 'cart' | 'vietqr';

export interface PosPageProps {
  initialSubTab?: PosSubTab;
}

export const PosPage: React.FC<PosPageProps> = ({ initialSubTab = 'cart' }) => {
  const [isVietQrDrawerOpen, setIsVietQrDrawerOpen] = useState(initialSubTab === 'vietqr');
  const [pendingVietQrCount, setPendingVietQrCount] = useState<number>(0);

  return (
    <div className="space-y-3.5">
      {/* Compact POS Top Bar with single-screen focus + quick Chờ VietQR drawer trigger */}
      <Card className="bg-gradient-to-r from-brand-pink-surface to-white !px-4 !py-3 sm:!px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 rounded-xl bg-brand-pink-light p-2.5 text-brand-highlight">
              <Store size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-brand-ink leading-tight truncate">
                Web POS Bán Hàng Trực Tiếp
              </h2>
              <p className="text-xs text-muted truncate">
                Quét mã vạch sản phẩm, kiểm tra điều kiện bán và thanh toán nhanh chóng
              </p>
            </div>
          </div>

          <button
            id="pos-open-vietqr-drawer"
            type="button"
            onClick={() => setIsVietQrDrawerOpen(true)}
            className={`self-start sm:self-auto shrink-0 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              pendingVietQrCount > 0
                ? 'border-brand-pink/60 bg-paper text-brand-ink hover:border-brand-highlight hover:bg-brand-pink-surface'
                : 'border-border/80 bg-paper text-ink hover:border-brand-pink/60 hover:bg-brand-pink-surface'
            }`}
            title="Mở danh sách hóa đơn đang chờ thanh toán VietQR"
          >
            {pendingVietQrCount > 0 && (
              <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" aria-hidden="true" />
            )}
            <QrCode className="size-4 text-brand-highlight shrink-0" aria-hidden="true" />
            <span>Chờ VietQR</span>
            <span
              className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10.5px] font-extrabold leading-none ${
                pendingVietQrCount > 0
                  ? 'bg-brand-highlight text-white'
                  : 'bg-surface text-muted'
              }`}
            >
              {pendingVietQrCount}
            </span>
          </button>
        </div>
      </Card>

      {/* Main POS Workspace: keeps full-screen focus at all times */}
      <PosCartWorkspace
        isActive={!isVietQrDrawerOpen}
        onSwitchToVietQr={() => setIsVietQrDrawerOpen(true)}
      />

      {/* Compact Chờ VietQR Slide-over Drawer (stays mounted for background 2.5s webhook toast & count) */}
      <PosVietQrWorkspace
        open={isVietQrDrawerOpen}
        onClose={() => setIsVietQrDrawerOpen(false)}
        onPendingCountChange={setPendingVietQrCount}
      />
    </div>
  );
};

export default PosPage;
