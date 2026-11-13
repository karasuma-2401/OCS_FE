import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { storageApi } from '@/api/storageApi';

interface ItemPhotoModalProps {
  open: boolean;
  onClose: () => void;
  itemName: string;
  itemCategory: string;
  itemSize: string;
  images: string[];
  onImagesChange: (newImages: string[]) => void;
}

export const ItemPhotoModal: React.FC<ItemPhotoModalProps> = ({
  open,
  onClose,
  itemName,
  itemCategory,
  itemSize,
  images,
  onImagesChange,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError(
        'Không thể mở camera thiết bị. Vui lòng cấp quyền truy cập camera trong trình duyệt hoặc sử dụng tính năng tải ảnh từ máy.',
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, activeTab]);

  if (!open) return null;

  const handleFilesSelected = async (files: FileList | File[]) => {
    if (uploading || !files || files.length === 0) return;
    setUploading(true);
    setErrorMsg(null);

    const uploadedUrls: string[] = [];
    const failedFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        failedFiles.push(`${file.name} (không phải định dạng ảnh)`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        failedFiles.push(`${file.name} (vượt quá 10MB)`);
        continue;
      }
      try {
        const res = await storageApi.uploadImage(file, 'inspections');
        if (res.url) {
          uploadedUrls.push(res.url);
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string; title?: string } } };
        const reason =
          axiosErr?.response?.data?.detail ||
          axiosErr?.response?.data?.title ||
          'Lỗi tải ảnh lên R2';
        failedFiles.push(`${file.name} (${reason})`);
      }
    }

    if (uploadedUrls.length > 0) {
      onImagesChange([...images, ...uploadedUrls]);
    }
    if (failedFiles.length > 0) {
      setErrorMsg(`Tải lên thất bại ${failedFiles.length} ảnh: ${failedFiles.join('; ')}.`);
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current || !cameraActive) return;
    setUploading(true);
    setErrorMsg(null);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      );

      if (!blob) throw new Error('Failed to create image blob');

      const file = new File([blob], `photo_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      const res = await storageApi.uploadImage(file, 'inspections');
      if (res.url) {
        onImagesChange([...images, res.url]);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setErrorMsg(
        axiosErr?.response?.data?.detail || 'Không thể chụp và tải ảnh từ camera.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    const urlToRemove = images[indexToRemove];
    if (!urlToRemove) return;
    setErrorMsg(null);
    try {
      await storageApi.deleteImage(urlToRemove);
      onImagesChange(images.filter((_, idx) => idx !== indexToRemove));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; title?: string } } };
      const reason =
        axiosErr?.response?.data?.detail ||
        axiosErr?.response?.data?.title ||
        'Không thể xóa ảnh khỏi hệ thống lưu trữ R2.';
      setErrorMsg(`Lỗi khi xóa ảnh: ${reason}`);
    }
  };

  const handleSetCoverImage = (indexToCover: number) => {
    if (indexToCover <= 0 || indexToCover >= images.length) return;
    const coverUrl = images[indexToCover];
    const rest = images.filter((_, idx) => idx !== indexToCover);
    onImagesChange([coverUrl, ...rest]);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl flex flex-col rounded-3xl bg-surface-default shadow-2xl border border-border/80 overflow-hidden text-text-primary">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-dashboard/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-text-primary">
                Ảnh Sản Phẩm Tiếp Nhận: {itemName || 'Sản phẩm'}
              </h3>
              <p className="text-xs text-text-muted">
                {itemCategory} {itemSize ? `• Size ${itemSize}` : ''} • Tải lên Cloudflare R2
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-default transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-border/60 bg-surface-default px-6 pt-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition border-b-2 ${
              activeTab === 'upload'
                ? 'border-brand-pink text-brand-highlight'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Upload size={14} /> Tải ảnh từ thiết bị
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition border-b-2 ${
              activeTab === 'camera'
                ? 'border-brand-pink text-brand-highlight'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Camera size={14} /> Chụp trực tiếp từ Camera
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                disabled={uploading}
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
              />
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!uploading && e.dataTransfer.files) {
                    handleFilesSelected(e.dataTransfer.files);
                  }
                }}
                className={`border-2 border-dashed border-border rounded-3xl p-6 text-center bg-surface-dashboard/50 transition flex flex-col items-center justify-center gap-2.5 group ${
                  uploading
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:border-brand-pink hover:bg-brand-pink-light/30'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs text-text-muted group-hover:text-brand-highlight group-hover:scale-105 transition">
                  {uploading ? (
                    <Loader2 size={24} className="animate-spin text-brand-highlight" />
                  ) : (
                    <Upload size={24} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary">
                    {uploading ? 'Đang tải ảnh lên Cloudflare R2...' : 'Nhấp hoặc kéo thả ảnh vào đây'}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Hỗ trợ định dạng JPG, PNG, WEBP (Tối đa 10MB/ảnh)
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 space-y-2">
                  <p className="font-bold">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-[11px]"
                  >
                    <RefreshCw size={12} /> Thử lại
                  </button>
                </div>
              ) : (
                <div className="relative rounded-3xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-3">
                    <button
                      type="button"
                      disabled={uploading || !cameraActive}
                      onClick={handleCapturePhoto}
                      style={{ color: '#FFFFFF' }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-pink hover:bg-brand-pink-hover !text-white font-extrabold text-xs shadow-lg transition active:scale-95 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Đang lưu ảnh...
                        </>
                      ) : (
                        <>
                          <Camera size={16} /> Chụp & Lưu ngay
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-text-primary">
                Ảnh đã đính kèm ({images.length})
              </span>
              <span className="text-text-muted text-[11px]">
                Ảnh đầu tiên sẽ tự động làm ảnh bìa sản phẩm
              </span>
            </div>

            {images.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-text-muted bg-surface-dashboard/30">
                Chưa có ảnh nào được chụp hoặc tải lên cho món đồ này.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((url, index) => (
                  <div
                    key={url + index}
                    className="group relative rounded-2xl overflow-hidden border border-border/80 bg-surface-dashboard aspect-square shadow-xs"
                  >
                    <img
                      src={url}
                      alt={`Ảnh ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {index === 0 ? (
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-brand-pink px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        Ảnh bìa
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCoverImage(index)}
                        disabled={uploading}
                        className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 hover:bg-brand-pink px-2 py-0.5 text-[10px] font-bold text-white transition opacity-90 sm:opacity-0 sm:group-hover:opacity-100 shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Đặt ảnh bìa
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      disabled={uploading}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600/90 hover:bg-red-700 text-white transition opacity-90 sm:opacity-0 sm:group-hover:opacity-100 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      title="Xóa ảnh"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border/70 bg-surface-dashboard/50">
          <div className="text-xs text-text-muted font-medium">
            {images.length > 0 ? `Đã lưu ${images.length} ảnh cho món đồ này.` : 'Bạn có thể chụp thêm ảnh bất cứ lúc nào.'}
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              stopCamera();
              onClose();
            }}
            style={{ color: '#FFFFFF' }}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-brand-pink hover:bg-brand-pink-hover !text-white font-extrabold text-xs shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={16} /> Xong
          </button>
        </div>
      </div>
    </div>
  );
};
