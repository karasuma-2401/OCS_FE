import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import {
  Banknote,
  Building2,
  Copy,
  Check,
  QrCode,
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Button, Modal } from '@/components/shared';
import { formatVnd } from '@/api/settlements';
import { formatVndInWords } from '@/utils/currencyWords';
import type {
  SettlementContract,
  SettlementPaymentMethod,
  RecordTransferPayload,
} from '@/types/settlement';

export interface SettlementTransferModalProps {
  open: boolean;
  settlement: SettlementContract | null;
  onClose: () => void;
  onConfirmTransfer: (payload: RecordTransferPayload) => Promise<void>;
  loading?: boolean;
}

export function SettlementTransferModal({
  open,
  settlement,
  onClose,
  onConfirmTransfer,
  loading = false,
}: SettlementTransferModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<SettlementPaymentMethod>('BankTransfer');
  const [bankReference, setBankReference] = useState('');
  const [transferDate, setTransferDate] = useState(() => {
    const now = new Date();
    // Local ISO datetime without seconds for input datetime-local
    const offset = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - offset);
    return local.toISOString().slice(0, 16);
  });
  const [transferNote, setTransferNote] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(true);
  const [error, setError] = useState('');

  // Uploaded proof document
  const [docFile, setDocFile] = useState<{
    fileName: string;
    fileType: 'image' | 'pdf';
    fileSize: number;
    dataUrl: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!settlement) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Dung lượng tệp không được vượt quá 10MB.');
      return;
    }

    const fileType: 'image' | 'pdf' = file.type === 'application/pdf' ? 'pdf' : 'image';
    const reader = new FileReader();
    reader.onload = () => {
      setDocFile({
        fileName: file.name,
        fileType,
        fileSize: file.size,
        dataUrl: reader.result as string,
      });
      setError('');
    };
    reader.onerror = () => {
      setError('Không thể đọc tệp đã chọn. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (paymentMethod === 'BankTransfer' && !bankReference.trim()) {
      setError('Vui lòng nhập mã giao dịch ngân hàng / mã tham chiếu FT để tiện đối soát.');
      return;
    }

    const payload: RecordTransferPayload = {
      paymentMethod,
      bankTransactionReference: bankReference.trim() || undefined,
      transferDate: transferDate ? new Date(transferDate).toISOString() : new Date().toISOString(),
      transferNote: transferNote.trim() || `Thanh toán quyết toán ${settlement.settlementNumber}`,
      bankCode: settlement.bankCode,
      bankName: settlement.bankName,
      bankAccountNumber: settlement.bankAccountNumber,
      bankAccountHolderName: settlement.bankAccountHolderName,
      receiptDocument: docFile || undefined,
    };

    try {
      await onConfirmTransfer(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi ghi nhận chuyển khoản.');
    }
  };

  // Build VietQR image URL
  const vietQrUrl = `https://img.vietqr.io/image/${settlement.bankCode}-${settlement.bankAccountNumber}-compact2.png?amount=${settlement.netPayout}&addInfo=${encodeURIComponent(
    `THANHTOAN ${settlement.settlementNumber}`
  )}&accountName=${encodeURIComponent(settlement.bankAccountHolderName)}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      disabled={loading}
      className="max-w-2xl"
      title={
        <div className="flex items-center gap-2">
          <Banknote className="text-brand-pink" size={22} aria-hidden="true" />
          <span>Ghi nhận chi trả & chuyển khoản</span>
        </div>
      }
      description={
        <span>
          Ghi nhận lệnh thanh toán cho khách hàng <strong>{settlement.customerName}</strong> ({settlement.customerPhone})
        </span>
      }
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Đóng
          </Button>
          <Button
            type="submit"
            form="settlement-transfer-form"
            variant="primary"
            loading={loading}
          >
            Lưu ghi nhận chuyển khoản
          </Button>
        </div>
      }
    >
      <form id="settlement-transfer-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Beneficiary & VietQR Card */}
        <div className="overflow-hidden rounded-xl border border-border bg-slate-50">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-slate-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Thông tin người thụ hưởng
                </span>
              </div>

              <div>
                <p className="text-xs text-text-muted">Ngân hàng</p>
                <p className="font-semibold text-brand-ink">
                  {settlement.bankName} ({settlement.bankCode})
                </p>
              </div>

              <div>
                <p className="text-xs text-text-muted">Số tài khoản</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-brand-highlight">
                    {settlement.bankAccountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(settlement.bankAccountNumber, 'accountNumber')}
                    className="rounded p-1 text-slate-500 hover:bg-slate-200"
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === 'accountNumber' ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-text-muted">Chủ tài khoản</p>
                <p className="font-medium uppercase text-slate-800">
                  {settlement.bankAccountHolderName}
                </p>
              </div>

              <div className="pt-1">
                <p className="text-xs text-text-muted">Số tiền cần chuyển</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-emerald-600">
                    {formatVnd(settlement.netPayout)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(settlement.netPayout), 'amount')}
                    className="rounded p-1 text-slate-500 hover:bg-slate-200"
                    title="Sao chép số tiền"
                  >
                    {copiedField === 'amount' ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
                <p className="text-xs italic text-text-muted">
                  ({formatVndInWords(settlement.netPayout)})
                </p>
              </div>
            </div>

            {/* VietQR Quick Scan */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 pb-2 text-xs font-medium text-slate-700">
                <QrCode size={16} className="text-brand-pink" />
                <span>Mã VietQR chuyển tiền</span>
              </div>
              {showQr ? (
                <div className="relative flex flex-col items-center">
                  <img
                    src={vietQrUrl}
                    alt={`VietQR ${settlement.bankCode} ${settlement.bankAccountNumber}`}
                    className="h-44 w-44 rounded object-contain"
                    onError={() => setShowQr(false)}
                  />
                  <span className="mt-1 text-[11px] text-text-muted">
                    Quét nhanh bằng app ngân hàng
                  </span>
                </div>
              ) : (
                <div className="flex h-44 w-44 flex-col items-center justify-center p-3 text-center text-xs text-text-muted">
                  <p>Quét mã VietQR trên app ngân hàng với nội dung:</p>
                  <code className="mt-1 font-mono text-[11px] font-bold text-brand-ink">
                    THANHTOAN {settlement.settlementNumber}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Form Fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-ink">
              Hình thức chi trả <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="BankTransfer"
                  checked={paymentMethod === 'BankTransfer'}
                  onChange={() => setPaymentMethod('BankTransfer')}
                  className="accent-brand-pink"
                />
                <span>Chuyển khoản</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash"
                  checked={paymentMethod === 'Cash'}
                  onChange={() => setPaymentMethod('Cash')}
                  className="accent-brand-pink"
                />
                <span>Tiền mặt tại quầy</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="transfer-date" className="mb-1 block text-sm font-medium text-brand-ink">
              Thời gian thực hiện <span className="text-rose-500">*</span>
            </label>
            <input
              id="transfer-date"
              type="datetime-local"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="w-full rounded-control border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
            />
          </div>
        </div>

        {paymentMethod === 'BankTransfer' && (
          <div>
            <label htmlFor="bank-ref" className="mb-1 block text-sm font-medium text-brand-ink">
              Mã giao dịch / Mã tham chiếu ngân hàng (FT Code) <span className="text-rose-500">*</span>
            </label>
            <input
              id="bank-ref"
              type="text"
              required={paymentMethod === 'BankTransfer'}
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="VD: FT261103987123 hoặc MB998822..."
              className="w-full rounded-control border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
            />
            <p className="mt-1 text-xs text-text-muted">
              Nhập mã giao dịch trên biên lai hoặc ứng dụng ngân hàng để phục vụ đối soát định kỳ.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="transfer-note" className="mb-1 block text-sm font-medium text-brand-ink">
            Ghi chú chi trả (tùy chọn)
          </label>
          <input
            id="transfer-note"
            type="text"
            value={transferNote}
            onChange={(e) => setTransferNote(e.target.value)}
            placeholder={`VD: Thanh toán quyết toán đợt 1 ${settlement.settlementNumber}`}
            className="w-full rounded-control border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
          />
        </div>

        {/* Upload Proof of Payment (Ủy nhiệm chi / Hóa đơn) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-ink">
            Tải lên chứng từ / Ủy nhiệm chi (ảnh hoặc PDF)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="hidden"
          />

          {docFile ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="shrink-0 text-emerald-600" size={24} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{docFile.fileName}</p>
                  <p className="text-xs text-text-muted">
                    {(docFile.fileSize / 1024).toFixed(1)} KB · {docFile.fileType.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDocFile(null)}
                  className="rounded p-1 text-rose-600 hover:bg-rose-100"
                  title="Xóa tệp"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-slate-50 p-4 text-center transition-colors hover:border-brand-pink hover:bg-brand-pink-surface"
            >
              <UploadCloud size={28} className="mb-1 text-brand-pink" />
              <p className="text-xs font-semibold text-brand-ink">
                Bấm vào đây để chọn ảnh chụp biên lai / ủy nhiệm chi
              </p>
              <p className="text-[11px] text-text-muted">
                Hỗ trợ định dạng JPG, PNG, PDF (tối đa 10MB)
              </p>
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
