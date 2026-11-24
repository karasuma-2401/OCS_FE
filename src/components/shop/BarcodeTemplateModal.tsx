import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, ScanBarcode, ShieldAlert } from 'lucide-react';
import {
  AlertBanner,
  Button,
  Input,
  Modal,
  SkeletonLoading,
} from '@/components/shared';
import {
  barcodeApi,
  type BarcodeLabelProduct,
  type BarcodeLabelTemplate,
} from '@/api/barcode';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { BarcodeLabel } from './BarcodeLabels';
import { barcodeModuleWidthMm } from './barcodeGeometry';

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
  widthMm: 60,
  heightMm: 35,
  columns: 3,
  fontSizePt: 8,
  version: '00000000-0000-0000-0000-000000000000',
  updatedAt: null,
};

const TEMPLATE_PRESETS = [
  { id: 'small-3col', label: 'Nhãn nhỏ · 3 cột', widthMm: 60, heightMm: 35, columns: 3, fontSizePt: 8 },
  { id: 'medium-2col', label: 'Nhãn vừa · 2 cột', widthMm: 75, heightMm: 40, columns: 2, fontSizePt: 9 },
  { id: 'large-2col', label: 'Nhãn lớn · 2 cột', widthMm: 90, heightMm: 50, columns: 2, fontSizePt: 10 },
] as const;

export function BarcodeTemplateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { hasRole } = useAuth();
  const toast = useToast();
  const canEdit = hasRole('Admin') || hasRole('Manager');

  const [template, setTemplate] = useState<BarcodeLabelTemplate>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError('');

    barcodeApi
      .getTemplate()
      .then((data) => {
        if (active) setTemplate(data);
      })
      .catch(() => {
        if (active) setTemplate(DEFAULT_TEMPLATE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  const moduleWidthMm = useMemo(
    () => barcodeModuleWidthMm(DEMO_PRODUCT.barcode, template.widthMm),
    [template.widthMm],
  );
  const isSharpEnough = moduleWidthMm >= 0.254;
  const totalWidthMm =
    template.columns * template.widthMm + (template.columns - 1) * 3;
  const exceedsA4 = totalWidthMm > 198;

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
    if (exceedsA4) {
      return `Tổng chiều rộng các cột (${totalWidthMm} mm) vượt quá khổ in A4 (tối đa 198 mm). Vui lòng giảm số cột hoặc chiều rộng nhãn.`;
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || saving) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const saved = await barcodeApi.saveTemplate(template);
      setTemplate(saved);
      toast.success('Đã lưu cấu hình mẫu in barcode.');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể lưu cấu hình mẫu in barcode.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    setTemplate((prev) => ({
      ...prev,
      widthMm: DEFAULT_TEMPLATE.widthMm,
      heightMm: DEFAULT_TEMPLATE.heightMm,
      columns: DEFAULT_TEMPLATE.columns,
      fontSizePt: DEFAULT_TEMPLATE.fontSizePt,
    }));
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cấu hình mẫu in barcode & thông tin sản phẩm"
      description="Tùy chỉnh kích thước, cỡ chữ và số cột nhãn barcode khổ A4 dùng trong toàn hệ thống."
      error={error}
      disabled={saving}
      className="max-w-4xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDefault}
                disabled={saving || loading}
                startIcon={<RotateCcw size={14} aria-hidden="true" />}
              >
                Khôi phục mặc định
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Đóng
            </Button>
            {canEdit && (
              <Button
                type="submit"
                form="barcode-template-form"
                variant="primary"
                loading={saving}
                disabled={loading || exceedsA4}
              >
                Lưu cấu hình
              </Button>
            )}
          </div>
        </div>
      }
    >
      {loading ? (
        <SkeletonLoading variant="list" count={2} label="Đang tải cấu hình mẫu…" />
      ) : (
        <div className="space-y-5">
          {!canEdit && (
            <AlertBanner
              variant="warning"
              icon={<ShieldAlert size={18} aria-hidden="true" />}
              title="Chế độ xem chỉ đọc"
              description="Chỉ người quản lý (Manager / Admin) mới có quyền chỉnh sửa cấu hình mẫu in barcode. Nhân viên chỉ xem các thông số hiện tại."
            />
          )}

          {canEdit && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Mẫu nhanh chuẩn A4
              </p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_PRESETS.map((preset) => {
                  const active =
                    template.widthMm === preset.widthMm &&
                    template.heightMm === preset.heightMm &&
                    template.columns === preset.columns &&
                    template.fontSizePt === preset.fontSizePt;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setTemplate((prev) => ({
                          ...prev,
                          widthMm: preset.widthMm,
                          heightMm: preset.heightMm,
                          columns: preset.columns,
                          fontSizePt: preset.fontSizePt,
                        }));
                        setError('');
                      }}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                        active
                          ? 'border-brand-highlight/60 bg-brand-pink-surface text-brand-highlight'
                          : 'border-border bg-white text-brand-ink hover:border-brand-lavender hover:bg-surface-active'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[11px] text-muted">
                        ({preset.widthMm}×{preset.heightMm}mm)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Cấu hình thông số */}
            <form
              id="barcode-template-form"
              onSubmit={(e) => void handleSave(e)}
              className="space-y-4 rounded-2xl border border-border bg-paper p-5"
            >
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
                  onChange={(e) =>
                    setTemplate({ ...template, widthMm: Number(e.target.value) })
                  }
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
                  onChange={(e) =>
                    setTemplate({ ...template, heightMm: Number(e.target.value) })
                  }
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
                  onChange={(e) =>
                    setTemplate({ ...template, columns: Number(e.target.value) })
                  }
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
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      fontSizePt: Number(e.target.value),
                    })
                  }
                  helperText="Chuẩn: 6 - 12 pt"
                />
              </div>

              <div
                className={`rounded-xl border p-3 text-xs ${
                  exceedsA4
                    ? 'border-state-danger-border bg-state-danger-soft text-state-danger-strong'
                    : 'border-border bg-surface-subtle text-muted'
                }`}
              >
                <p>
                  <strong>Quy tắc khổ giấy A4:</strong> Tổng chiều rộng{' '}
                  {template.columns} cột là{' '}
                  <span className="font-bold tabular-nums text-ink">
                    {totalWidthMm} mm
                  </span>{' '}
                  (tối đa 198 mm, trừ lề in).
                </p>
                {template.updatedAt && (
                  <p className="mt-1 text-[11px] opacity-80">
                    Cập nhật lần cuối:{' '}
                    {new Date(template.updatedAt).toLocaleString('vi-VN')}
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
                  {template.widthMm}mm × {template.heightMm}mm · Cỡ chữ{' '}
                  {template.fontSizePt}pt · {template.columns} cột/trang
                </p>
              </div>

              <div className="overflow-hidden rounded-lg bg-white shadow-md transition-all duration-200">
                <BarcodeLabel item={DEMO_PRODUCT} template={template} />
              </div>

              {/* Chỉ báo độ nét Code 128 */}
              <div
                className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  isSharpEnough
                    ? 'bg-state-success-soft text-state-success-strong'
                    : 'bg-state-warning-soft text-state-warning-strong'
                }`}
              >
                {isSharpEnough ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : (
                  <ScanBarcode size={14} aria-hidden="true" />
                )}
                <span>
                  {isSharpEnough
                    ? `Độ nét Code 128 tốt (${moduleWidthMm.toFixed(2)} mm/vạch)`
                    : `Vạch hơi mảnh (${moduleWidthMm.toFixed(2)} mm/vạch) — nên tăng bề rộng nhãn`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
