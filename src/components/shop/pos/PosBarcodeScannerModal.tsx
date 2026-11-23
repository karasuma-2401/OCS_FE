import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, AlertCircle, RefreshCw, Keyboard } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button, Modal } from '@/components/shared';
import { posAudio } from './posAudio';

export interface PosBarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export const PosBarcodeScannerModal: React.FC<PosBarcodeScannerModalProps> = ({
  open,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [manualInput, setManualInput] = useState('');

  // Handle successful detection
  const handleDetected = useCallback((text: string) => {
    const cleaned = text.trim();
    if (cleaned) {
      posAudio.playScanBeep();
      onScanSuccess(cleaned);
      onClose();
    }
  }, [onScanSuccess, onClose]);

  // Clean up scanner and media streams
  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        // ignore
      }
      readerRef.current = null;
    }
  }, []);

  // Initialize and start camera scanning
  const startScanner = useCallback(async (deviceId?: string) => {
    stopScanner();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const codeReader = new BrowserMultiFormatReader();
      readerRef.current = codeReader;

      // List available cameras
      let videoDevices: MediaDeviceInfo[] = [];
      try {
        videoDevices = await codeReader.listVideoInputDevices();
        setDevices(videoDevices);
      } catch {
        // May fail if enumerateDevices not permitted yet
      }

      // Choose device: specified > back camera > first device
      let targetDeviceId = deviceId;
      if (!targetDeviceId && videoDevices.length > 0) {
        const backCam = videoDevices.find((d) => {
          const label = d.label.toLowerCase();
          return label.includes('back') || label.includes('sau') || label.includes('environment');
        });
        targetDeviceId = backCam?.deviceId || videoDevices[0].deviceId;
      }
      setSelectedDeviceId(targetDeviceId);

      if (!videoRef.current) return;

      // Start decoding from camera stream
      await codeReader.decodeFromVideoDevice(
        targetDeviceId ?? null,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleDetected(result.getText());
          }
          // Note: ZXing continuously fires NotFoundException while scanning empty frames, which is normal
          if (error && error.name !== 'NotFoundException') {
            // Non-critical frame decode error
          }
        }
      );

      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
        setErrorMessage('Quyền truy cập camera bị từ chối. Vui lòng cho phép quyền Camera trên trình duyệt để sử dụng.');
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        setErrorMessage('Không tìm thấy camera hoặc webcam nào trên thiết bị này.');
      } else {
        setErrorMessage('Không thể khởi động camera: ' + msg);
      }
    }
  }, [handleDetected, stopScanner]);

  // Start on modal open, stop on close
  useEffect(() => {
    if (open) {
      void startScanner(selectedDeviceId);
    } else {
      stopScanner();
      setErrorMessage(null);
      setIsLoading(true);
      setManualInput('');
    }

    return () => {
      stopScanner();
    };
  }, [open, selectedDeviceId, startScanner, stopScanner]);

  // Handle manual submit inside modal
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleDetected(manualInput.trim());
    }
  };

  // Switch to next camera
  const handleSwitchCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    if (nextDevice) {
      setSelectedDeviceId(nextDevice.deviceId);
      void startScanner(nextDevice.deviceId);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 text-amber-600">
          <Camera className="size-5" aria-hidden="true" />
          <span className="font-extrabold text-ink">Máy quét mã vạch Barcode</span>
        </div>
      }
      description="Hướng camera vào mã vạch (Barcode / QR) trên tem mác sản phẩm để tự động nhận diện."
      className="max-w-md"
      footer={
        <div className="flex items-center justify-between w-full">
          {devices.length > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              startIcon={<RefreshCw className="size-3.5" aria-hidden="true" />}
              onClick={handleSwitchCamera}
              title="Đổi camera trước / sau"
            >
              Đổi camera
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Camera Viewport & Viewfinder Container */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black shadow-inner flex items-center justify-center">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Loading Indicator */}
          {isLoading && !errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-2 z-10">
              <RefreshCw className="size-6 animate-spin text-amber-400" aria-hidden="true" />
              <span className="text-xs font-semibold">Đang kết nối camera...</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 text-white p-6 text-center gap-2.5 z-20">
              <AlertCircle className="size-8 text-amber-500" aria-hidden="true" />
              <p className="text-xs font-medium text-amber-100 leading-relaxed max-w-xs">
                {errorMessage}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void startScanner(selectedDeviceId)}
                className="mt-2 text-xs bg-white text-ink border-white enabled:hover:bg-white/90 enabled:hover:border-white"
              >
                Thử kết nối lại
              </Button>
            </div>
          )}

          {/* Viewfinder Target Box Overlay (Amber / Orange theme) */}
          {!isLoading && !errorMessage && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Target Bounding Box */}
              <div className="relative h-44 w-64 rounded-xl border-2 border-dashed border-amber-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* 4 Corner Markers */}
                <span className="absolute -top-1 -left-1 size-4 border-t-3 border-l-3 border-amber-400 rounded-tl" />
                <span className="absolute -top-1 -right-1 size-4 border-t-3 border-r-3 border-amber-400 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 size-4 border-b-3 border-l-3 border-amber-400 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 size-4 border-b-3 border-r-3 border-amber-400 rounded-br" />

                {/* Animated Horizontal Laser Scanner Line */}
                <div
                  className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-bounce"
                  style={{ animationDuration: '2s' }}
                />
              </div>

              <div className="absolute bottom-3 text-center">
                <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                  Căn mã vạch vào giữa khung
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fallback Manual Input */}
        <form onSubmit={handleManualSubmit} className="space-y-1.5 pt-1">
          <label className="block text-[11px] font-bold text-muted uppercase flex items-center gap-1">
            <Keyboard className="size-3 text-muted" aria-hidden="true" />
            <span>Hoặc nhập mã barcode thủ công:</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Nhập mã vạch sản phẩm..."
              className="flex-1 rounded-xl border border-border bg-paper px-3 py-2 text-xs font-semibold text-ink placeholder:text-muted/60 focus:border-brand-highlight focus:outline-none"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!manualInput.trim()}
              className="text-xs bg-amber-500 enabled:hover:bg-amber-600 text-white font-bold border-amber-500"
            >
              Thêm
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
