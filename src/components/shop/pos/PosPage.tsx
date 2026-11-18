import React, { useState } from 'react';
import { ShoppingCart, QrCode, Store } from 'lucide-react';
import { PageHeaderCard } from '@/components/shared';
import { PosCartWorkspace } from './PosCartWorkspace';
import { PosVietQrWorkspace } from './PosVietQrWorkspace';

export type PosSubTab = 'cart' | 'vietqr';

export interface PosPageProps {
  initialSubTab?: PosSubTab;
}

export const PosPage: React.FC<PosPageProps> = ({ initialSubTab = 'cart' }) => {
  const [activeSubTab, setActiveSubTab] = useState<PosSubTab>(initialSubTab);

  return (
    <div className="space-y-6">
      {/* POS Top Navigation Header */}
      <PageHeaderCard
        icon={<Store size={24} aria-hidden="true" />}
        title="Web POS Bán Hàng Trực Tiếp"
        description="Quét mã vạch sản phẩm độc bản, tự động kiểm tra điều kiện bán và chốt đơn thanh toán tức thời."
        actions={
          <div className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-surface/70 p-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('cart')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeSubTab === 'cart'
                  ? 'bg-paper text-brand-ink shadow-xs border border-border/60'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              <span>Giỏ hàng bán lẻ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('vietqr')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeSubTab === 'vietqr'
                  ? 'bg-paper text-brand-ink shadow-xs border border-border/60'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <QrCode className="size-4" aria-hidden="true" />
              <span>Hóa đơn chờ VietQR</span>
            </button>
          </div>
        }
      />

      {/* Active SubTab Workspace */}
      {activeSubTab === 'cart' ? (
        <PosCartWorkspace onSwitchToVietQr={() => setActiveSubTab('vietqr')} />
      ) : (
        <PosVietQrWorkspace />
      )}
    </div>
  );
};

export default PosPage;
