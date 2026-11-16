import { useEffect, useState } from 'react';
import { Button, Card, ErrorState, Input, Select, SkeletonLoading } from '@/components/shared';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { getManagedTemplate, saveManagedTemplate, type ContractTemplate } from '@/api/contracts';
import { UnifiedContractSheet } from '@/components/shop/UnifiedContractSheet';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

const DEFAULT_TERMS_FALLBACK = `1. BÊN A cam kết bảo quản sản phẩm ký gửi của BÊN B trong điều kiện tốt nhất, phù hợp với tiêu chuẩn bảo quản hàng thời trang.
2. BÊN B cam kết các sản phẩm ký gửi thuộc quyền sở hữu hợp pháp của mình, có nguồn gốc xuất xứ rõ ràng và tình trạng đúng như mô tả.
3. Khi sản phẩm được bán thành công, BÊN A sẽ quyết toán và thanh toán cho BÊN B sau khi trừ tỷ lệ hoa hồng dịch vụ đã thỏa thuận trong hợp đồng.
4. Trường hợp hết hạn hợp đồng mà sản phẩm chưa bán được, hai bên sẽ xử lý theo hình thức đã thỏa thuận (Trả lại khách hàng hoặc Quyên góp theo chính sách bảo vệ môi trường).
5. Mọi tranh chấp phát sinh sẽ được hai bên ưu tiên giải quyết thông qua thương lượng trên tinh thần hợp tác và tôn trọng lẫn nhau.`;

const SAMPLE_PREVIEW_PRODUCTS = [
  {
    id: 'sample-1',
    name: 'Đầm hoa nhí tay bồng phong cách Vintage OCS',
    barcode: 'OCS-SAMPLE-001',
    size: 'M',
    material: 'Lụa tơ tằm',
    conditionPercentage: 95,
    listedPrice: 350000,
    agreedCommissionRate: 20,
    customerPayout: 280000,
    brandName: 'Zara Vietnam',
    categoryName: 'Đầm / Váy',
  },
  {
    id: 'sample-2',
    name: 'Áo khoác Blazer kẻ caro dáng rộng',
    barcode: 'OCS-SAMPLE-002',
    size: 'L',
    material: 'Dạ Tweed',
    conditionPercentage: 90,
    listedPrice: 520000,
    agreedCommissionRate: 15,
    customerPayout: 442000,
    brandName: 'Mango Authentic',
    categoryName: 'Áo khoác',
  },
];

export function ContractTemplatePage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('Admin') || hasRole('Manager');

  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getManagedTemplate()
      .then(data => {
        if (!active) return;
        setTemplate({
          ...data,
          title: data.title || 'HỢP ĐỒNG DỊCH VỤ KÝ GỬI THỜI TRANG',
          organizationName: data.organizationName || 'CỬA HÀNG OLD CLOTHES STORE (OCS)',
          headerText: data.headerText || 'Hôm nay, hai bên thống nhất ký kết hợp đồng dịch vụ ký gửi hàng hóa với các điều khoản cụ thể sau:',
          defaultTerms: data.defaultTerms || DEFAULT_TERMS_FALLBACK,
          footerText: data.footerText || 'Hợp đồng này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.',
          defaultTermDays: data.defaultTermDays ?? 60,
          defaultExpiryHandling: data.defaultExpiryHandling || 'Return',
        });
      })
      .catch(err => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải cấu hình mẫu hợp đồng.';
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !template) return;

    if (!template.title.trim()) {
      setError('Tiêu đề hợp đồng không được để trống.');
      return;
    }
    if (!template.organizationName.trim()) {
      setError('Tên đơn vị / cửa hàng không được để trống.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const saved = await saveManagedTemplate({
        ...template,
        defaultTermDays: Number(template.defaultTermDays) || 60,
        defaultExpiryHandling: template.defaultExpiryHandling || 'Return',
      });
      setTemplate({
        ...saved,
        defaultTermDays: saved.defaultTermDays ?? template.defaultTermDays ?? 60,
        defaultExpiryHandling: saved.defaultExpiryHandling || template.defaultExpiryHandling || 'Return',
      });
      setSuccess('Đã lưu mẫu hợp đồng thành công! Mẫu này sẽ tự động áp dụng đồng nhất cho các hợp đồng tiếp nhận mới.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu mẫu hợp đồng.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const today = new Date();
  const endsDate = new Date(today);
  endsDate.setDate(today.getDate() + (template?.defaultTermDays || 60));

  return (
    <ContractPageLayout
      title="Quản lý mẫu hợp đồng"
      description="Cấu hình tiêu đề, đơn vị, thời hạn và điều khoản mẫu hợp đồng duy nhất áp dụng trên toàn hệ thống."
      backTo="/shop/contracts"
      backLabel="Quản lý hợp đồng"
    >
      <div className="space-y-6">
        {!canEdit && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldAlert className="shrink-0 text-amber-600" size={20} />
            <div>
              <p className="font-bold">Chế độ xem chỉ đọc</p>
              <p className="text-xs text-amber-700">
                Chỉ người quản lý (Manager / Admin) mới có quyền chỉnh sửa điều khoản và thông tin mẫu hợp đồng. Nhân viên chỉ xem cấu hình hiện hành.
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

        {loading || !template ? (
          <SkeletonLoading variant="list" count={4} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Form chỉnh sửa mẫu hợp đồng */}
            <form onSubmit={handleSave} className="space-y-4 lg:col-span-6">
              <Card
                title="Thông tin cấu hình mẫu hợp đồng"
                description="Thiết lập các trường nội dung mẫu áp dụng cho tất cả các hợp đồng mới."
                actions={
                  canEdit && (
                    <Button
                      type="submit"
                      variant="primary"
                      loading={saving}
                      disabled={saving}
                    >
                      Lưu mẫu hợp đồng
                    </Button>
                  )
                }
              >
                <div className="space-y-4">
                  <Input
                    label="Tiêu đề hợp đồng *"
                    required
                    disabled={!canEdit || saving}
                    value={template.title}
                    onChange={e => setTemplate({ ...template, title: e.target.value })}
                    helperText="Ví dụ: HỢP ĐỒNG DỊCH VỤ KÝ GỬI THỜI TRANG"
                  />

                  <Input
                    label="Tên đơn vị / Cửa hàng (Bên A) *"
                    required
                    disabled={!canEdit || saving}
                    value={template.organizationName}
                    onChange={e => setTemplate({ ...template, organizationName: e.target.value })}
                    helperText="Ví dụ: CỬA HÀNG OLD CLOTHES STORE (OCS)"
                  />

                  <Input
                    label="Lời mở đầu / Căn cứ ký kết"
                    disabled={!canEdit || saving}
                    value={template.headerText}
                    onChange={e => setTemplate({ ...template, headerText: e.target.value })}
                    helperText="Đoạn văn mở đầu dưới phần thông tin cửa hàng"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Thời hạn ký gửi mặc định (ngày) *"
                      type="number"
                      min={1}
                      max={60}
                      required
                      disabled={!canEdit || saving}
                      value={template.defaultTermDays ?? 60}
                      onChange={e => setTemplate({ ...template, defaultTermDays: Number(e.target.value) || 60 })}
                      helperText="Thời hạn hiệu lực tiêu chuẩn (tối đa 60 ngày)"
                    />

                    <Select
                      label="Phương thức hoàn trả mặc định *"
                      disabled={!canEdit || saving}
                      value={template.defaultExpiryHandling || 'Return'}
                      onChange={e => setTemplate({ ...template, defaultExpiryHandling: e.target.value as 'Return' | 'Donate' })}
                    >
                      <option value="Return">Trả lại khách hàng khi hết hạn</option>
                      <option value="Donate">Quyên góp từ thiện theo chính sách</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-ink">
                      Điều khoản hợp đồng mặc định *
                    </label>
                    <textarea
                      rows={10}
                      disabled={!canEdit || saving}
                      value={template.defaultTerms}
                      onChange={e => setTemplate({ ...template, defaultTerms: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-border bg-paper p-3 text-xs leading-relaxed text-ink focus:border-brand-pink-focus focus:outline-none focus:ring-1 focus:ring-brand-pink-focus disabled:bg-surface-subtle"
                      placeholder="Nhập các điều khoản quy định trách nhiệm hai bên, chính sách hoa hồng, xử lý hết hạn..."
                    />
                    <p className="mt-1 text-xs text-muted">
                      Nội dung điều khoản này sẽ được hiển thị đồng nhất trên các phiếu ký nhận và hợp đồng lưu trữ.
                    </p>
                  </div>

                  <Input
                    label="Lưu ý / Chân trang hợp đồng"
                    disabled={!canEdit || saving}
                    value={template.footerText}
                    onChange={e => setTemplate({ ...template, footerText: e.target.value })}
                    helperText="Ví dụ: Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau..."
                  />

                  {template.updatedAt && (
                    <p className="pt-2 text-right text-xs text-muted">
                      Cập nhật lần cuối: {new Date(template.updatedAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </Card>
            </form>

            {/* Bản xem trước trực quan dùng UnifiedContractSheet đồng nhất */}
            <div className="space-y-4 lg:col-span-6">
              <Card
                title="Bản xem trước hợp đồng mẫu"
                description="Bố cục chuẩn A4 phản ánh trực tiếp theo nội dung cấu hình ở bên trái."
              >
                <div className="max-h-[80vh] overflow-y-auto rounded-xl border border-gray-300 bg-white p-2 shadow-inner">
                  <UnifiedContractSheet
                    title={template.title}
                    organizationName={template.organizationName}
                    headerText={template.headerText}
                    footerText={template.footerText}
                    contractNumber="HD-MAU-2026"
                    signedAt={today.toISOString()}
                    endsAt={endsDate.toISOString()}
                    expiryHandling={template.defaultExpiryHandling}
                    employeeName="Nguyễn Văn Quản Lý"
                    employeeTitle="Cửa hàng trưởng OCS"
                    employeePhone="0901 888 999"
                    customerName="Nguyễn Thị Khách Hàng (Mẫu)"
                    customerPhone="0909 123 456"
                    customerEmail="khachhang@example.com"
                    customerIdentity="079201000123"
                    customerAddress="123 Đường Thời Trang, P. Bến Nghé, Quận 1, TP. HCM"
                    bankCode="VCB"
                    bankAccountNumber="1023456789"
                    bankAccountHolderName="NGUYEN THI KHACH HANG"
                    products={SAMPLE_PREVIEW_PRODUCTS}
                    terms={template.defaultTerms}
                    isDraftPreview={true}
                    printableId="template-preview-sheet"
                  />
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </ContractPageLayout>
  );
}
