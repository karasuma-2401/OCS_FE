import { Download, FileText } from 'lucide-react';
import { Button, Modal } from '@/components/shared';
import type { SettlementDocument } from '@/types/settlement';

export interface SettlementDocumentLightboxProps {
  open: boolean;
  document: SettlementDocument | null;
  onClose: () => void;
}

export function SettlementDocumentLightbox({
  open,
  document,
  onClose,
}: SettlementDocumentLightboxProps) {
  if (!document) return null;

  const handleDownload = () => {
    const a = window.document.createElement('a');
    a.href = document.dataUrl;
    a.download = document.fileName || 'chung-tu-quyet-toan';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const isPdf = document.fileType === 'pdf';

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-3xl"
      title={
        <div className="flex items-center gap-2">
          <FileText className="text-brand-pink" size={20} />
          <span className="truncate">{document.fileName}</span>
        </div>
      }
      description={
        <span>
          Tải lên bởi <strong>{document.uploadedByName}</strong> lúc{' '}
          {new Date(document.uploadedAt).toLocaleString('vi-VN')} ·{' '}
          {(document.fileSize / 1024).toFixed(1)} KB
        </span>
      }
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-text-muted">
            Loại chứng từ:{' '}
            {document.documentType === 'TransferReceipt'
              ? 'Biên lai chuyển khoản / UNC'
              : 'Chứng từ khác'}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleDownload}
              startIcon={<Download size={16} />}
            >
              Tải chứng từ về máy
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-[300px] max-h-[70vh] items-center justify-center overflow-auto rounded-lg bg-slate-100 p-2">
        {isPdf ? (
          <iframe
            src={document.dataUrl}
            title={document.fileName}
            className="h-[60vh] w-full rounded border-0 bg-white"
          />
        ) : (
          <img
            src={document.dataUrl}
            alt={document.fileName}
            className="max-h-[65vh] max-w-full rounded object-contain shadow-xs"
          />
        )}
      </div>
    </Modal>
  );
}
