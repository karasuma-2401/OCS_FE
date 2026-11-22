import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface PosPrinterDeviceProps {
  /**
   * Whether the printer is currently feeding / printing paper
   */
  isPrinting?: boolean;
  /**
   * Trigger to replay the paper feed animation
   */
  onFeed?: () => void;
  className?: string;
}

export const PosPrinterDevice: React.FC<PosPrinterDeviceProps> = ({
  isPrinting = false,
  onFeed,
  className = '',
}) => {
  return (
    <div
      className={`pos-printer-chassis no-print ${className}`}
      data-testid="pos-printer-device"
    >
      {/* 1. Recessed Paper Exit Slot with Metallic Cutter Blade */}
      <div className="pos-printer-slot">
        <div className="pos-printer-cutter" />
      </div>

      {/* 2. Top Lid Opening Seam Line */}
      <div className="pos-printer-lid-seam" aria-hidden="true" />

      {/* 3. Front Face Panel: Hardware LED & Tactile FEED Button */}
      <div className="flex items-center justify-between px-1.5 pt-1 text-xs">
        {/* Left: Tiny Hardware Power/Status Pinhole LED */}
        <div className="flex items-center gap-1.5" title={isPrinting ? 'Đang in hóa đơn' : 'Máy in sẵn sàng'}>
          <span
            className={`size-2 rounded-full transition-all duration-300 ${
              isPrinting
                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
            }`}
          />
          <span className="text-[9.5px] font-mono tracking-wider font-semibold text-zinc-400 uppercase select-none">
            {isPrinting ? 'PRINT' : 'READY'}
          </span>
        </div>

        {/* Center/Right: Tactile Physical Replay/Feed Button */}
        {onFeed && (
          <button
            type="button"
            onClick={onFeed}
            disabled={isPrinting}
            className="pos-printer-feed-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shrink-0 active:scale-95"
            title="Bấm để in lại hiệu ứng cuộn hóa đơn từ máy in"
            aria-label="In lại hiệu ứng cuộn hóa đơn"
          >
            <RotateCcw
              className={`size-3 text-zinc-400 group-hover:text-white transition-transform ${
                isPrinting ? 'animate-spin text-rose-400' : ''
              }`}
              aria-hidden="true"
            />
            <span>{isPrinting ? 'Đang in bill...' : 'In lại'}</span>
          </button>
        )}

        {/* Right: Thermal Head Spec Mark */}
        <div className="text-[9.5px] font-mono text-zinc-500 font-semibold uppercase tracking-wider select-none">
          80MM
        </div>
      </div>

      {/* 4. Bottom Base Rubber Feet */}
      <div className="pos-printer-feet" aria-hidden="true">
        <span className="pos-printer-foot" />
        <span className="pos-printer-foot" />
      </div>
    </div>
  );
};

export default PosPrinterDevice;
