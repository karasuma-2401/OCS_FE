import { useEffect, useState } from 'react';
import { Button, ErrorState, Input, Modal, SkeletonLoading } from '@/components/shared';
import { barcodeApi, type BarcodeLabelProduct, type BarcodeLabelTemplate } from '@/api/barcode';
import { useAuth } from '@/context/AuthContext';
import { BarcodeLabel } from './BarcodeLabels';
import { ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';

const DEMO_PRODUCT: BarcodeLabelProduct = {
  id: 'demo-sample-1',
  name: 'Áo Polo Piqué Cổ Bẻ Cao Cấp',
  barcode: 'OCS-20261115-DEMO',
  listedPrice: 350000,
  size: 'L',
  brand: 'ZARA',
  condition: '95%',
};

const DEFAULT_TEMPLATE: BarcodeLabelTemplate = {
  widthMm: 65,
  heightMm: 35,
  columns: 2,
  fontSizePt: 8,
  version: '00000000-0000-0000-0000-000000000000',
  updatedAt: null,
};

export function BarcodeTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hasRole } = useAuth();
  const canEdit = hasRole('Admin') || hasRole('Manager');

  const [template, setTemplate] = useState<BarcodeLabelTemplate>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError('');
    setSuccess('');

    barcodeApi.getTemplate()
      .then(data => {
        if (active) setTemplate(data);
      })
      .catch(() => {
        if (active) {
          // If template endpoint fails or not yet initialized, fallback to default template
          setTemplate(DEFAULT_TEMPLATE);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [open]);

  const validate = (): string | null => {
    if (template.widthMm < 40 || template.widthMm > 90) {
      return 'Chiều rộng nhãn phải từ 40 mm đến 90 mm.';
    }
    if (template.heightMm < 25 || template.heightMm > 60) {
      return 'Chiều cao nhãn phải từ 25 mm đến 60 mm.';
    }
    if (template.columns < 1 || template.columns > 4) {
      return 'Số cột in phải từ 1 đến 4 cột.';
    }
    if (template.fontSizePt < 6 || template.fontSizePt > 12) {
      return 'Cỡ chữ phải từ 6 pt đến 12 pt.';
    }
    const totalWidthMm = template.columns * template.widthMm + (template.columns - 1) * 3;
    if (totalWidthMm > 198) {
      return `Tổng chiều rộng các cột (${totalWidthMm} mm) vượt quá khổ in A4 (tối đa 198 mm). Vui lòng giảm số cột hoặc chiều rộng nhãn.`;
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const saved = await barcodeApi.saveTemplate(template);
      setTemplate(saved);
      setSuccess('Đã lưu cấu hình mẫu in barcode thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu cấu hình mẫu in barcode.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    setTemplate(prev => ({
      ...prev,
      widthMm: 65,
      heightMm: 35,
      columns: 2,
      fontSizePt: 8,
    }));
    setError('');
    setSuccess('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cấu hình mẫu in barcode & thông tin sản phẩm"
      description="Tùy chỉnh kích thước, cỡ chữ và số cột nhãn barcode dùng trong toàn hệ thống."
      className="max-w-4xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDefault}
                disabled={saving || loading}
                className="gap-1.5 text-xs text-muted"
              >
                <RotateCcw size={14} /> Khôi phục mặc định
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Đóng
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={loading}
              >
                Lưu cấu hình
              </Button>
            )}
          </div>
        </div>
      }
    >
      {loading ? (
        <SkeletonLoading variant="list" count={2} />
      ) : (
        <div className="space-y-6">
          {!canEdit && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldAlert className="shrink-0 text-amber-600" size={20} />
              <div>
                <p className="font-bold">Chế độ xem chỉ đọc</p>
                <p className="text-xs text-amber-700">
                  Chỉ người quản lý (Manager / Admin) mới có quyền chỉnh sửa cấu hình mẫu in barcode. Nhân viên chỉ xem các thông số hiện tại.
                </p>
              </div>
            </div>
          )}

          {error && <ErrorState description={error} />}
          {success && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Cấu hình thông số */}
            <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-border bg-paper p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink">
                Thông số nhãn in
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Chiều rộng nhãn (mm)"
                  type="number"
                  min={40}
                  max={90}
                  step={1}
                  disabled={!canEdit || saving}
                  value={template.widthMm}
                  onChange={e => setTemplate({ ...template, widthMm: Number(e.target.value) })}
                  helperText="Chuẩn: 40 - 90 mm"
                />

                <Input
                  label="Chiều cao nhãn (mm)"
                  type="number"
                  min={25}
                  max={60}
                  step={1}
                  disabled={!canEdit || saving}
                  value={template.heightMm}
                  onChange={e => setTemplate({ ...template, heightMm: Number(e.target.value) })}
                  helperText="Chuẩn: 25 - 60 mm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Số tem / hàng (A4)"
                  type="number"
                  min={1}
                  max={4}
                  step={1}
                  disabled={!canEdit || saving}
                  value={template.columns}
                  onChange={e => setTemplate({ ...template, columns: Number(e.target.value) })}
                  helperText="1 - 4 cột trên khổ A4"
                />

                <Input
                  label="Cỡ chữ (pt)"
                  type="number"
                  min={6}
                  max={12}
                  step={1}
                  disabled={!canEdit || saving}
                  value={template.fontSizePt}
                  onChange={e => setTemplate({ ...template, fontSizePt: Number(e.target.value) })}
                  helperText="Chuẩn: 6 - 12 pt"
                />
              </div>

              <div className="rounded-xl bg-surface-subtle p-3 text-xs text-muted">
                <p>
                  <strong>Quy tắc khổ giấy A4:</strong> Tổng chiều rộng {template.columns} cột là{' '}
                  <span className="font-bold text-ink">
                    {template.columns * template.widthMm + (template.columns - 1) * 3} mm
                  </span>{' '}
                  (tối đa 198 mm, trừ lề in).
                </p>
                {template.updatedAt && (
                  <p className="mt-1 text-[11px] text-muted">
                    Lần cập nhật cuối: {new Date(template.updatedAt).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
            </form>

            {/* Xem trước trực tiếp tem nhãn */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50/80 p-6">
              <div className="mb-3 w-full text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Bản xem trước trực quan (Tỉ lệ thực tế)
                </span>
                <p className="text-[11px] text-muted">
                  {template.widthMm}mm × {template.heightMm}mm · Cỡ chữ {template.fontSizePt}pt · {template.columns} cột/trang
                </p>
              </div>

              {/* Tem mẫu: Đồng bộ 100% với BarcodeLabel khi in thực tế */}
              <div className="shadow-lg rounded-lg overflow-hidden transition-all bg-white">
                <BarcodeLabel item={DEMO_PRODUCT} template={template} />
              </div>

              <p className="mt-4 text-center text-xs text-muted italic">
                * Bản in web thuần túy, mã vạch Code 128 rõ nét và không kèm ảnh sản phẩm.
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
