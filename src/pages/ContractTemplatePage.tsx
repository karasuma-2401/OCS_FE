import { useEffect, useState } from 'react';
import { Button, Card, ErrorState, Input, SkeletonLoading } from '@/components/shared';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { getManagedTemplate, saveManagedTemplate, type ContractTemplate } from '@/api/contracts';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, ShieldAlert, Download } from 'lucide-react';

const DEFAULT_TERMS_FALLBACK = `1. BÊN A cam kết bảo quản sản phẩm ký gửi của BÊN B trong điều kiện tốt nhất, phù hợp với tiêu chuẩn bảo quản hàng thời trang.
2. BÊN B cam kết các sản phẩm ký gửi thuộc quyền sở hữu hợp pháp của mình, có nguồn gốc xuất xứ rõ ràng và tình trạng đúng như mô tả.
3. Khi sản phẩm được bán thành công, BÊN A sẽ quyết toán và thanh toán cho BÊN B sau khi trừ tỷ lệ hoa hồng dịch vụ đã thỏa thuận trong hợp đồng.
4. Trường hợp hết hạn hợp đồng mà sản phẩm chưa bán được, hai bên sẽ xử lý theo hình thức đã thỏa thuận (Trả lại khách hàng hoặc Quyên góp theo chính sách bảo vệ môi trường).
5. Mọi tranh chấp phát sinh sẽ được hai bên ưu tiên giải quyết thông qua thương lượng trên tinh thần hợp tác và tôn trọng lẫn nhau.`;

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
      const saved = await saveManagedTemplate(template);
      setTemplate(saved);
      setSuccess('Đã lưu mẫu hợp đồng thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu mẫu hợp đồng.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ContractPageLayout
      title="Quản lý mẫu hợp đồng"
      description="Cấu hình tiêu đề, thông tin đơn vị và điều khoản mẫu hợp đồng hiển thị trên giao diện web."
      backTo="/shop/contracts"
      backLabel="Quản lý hợp đồng"
      headerActions={
        <a
          href="/api/word-template-samples/contract"
          download="mau-hop-dong.docx"
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-lavender bg-white px-3.5 py-2 text-xs font-bold text-brand-ink hover:bg-brand-pink-surface hover:border-brand-highlight transition whitespace-nowrap shrink-0"
        >
          <Download size={15} aria-hidden="true" />
          Tải mẫu Word
        </a>
      }
    >
      <div className="space-y-6">
        {!canEdit && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldAlert className="shrink-0 text-amber-600" size={20} />
            <div>
              <p className="font-bold">Chế độ xem chỉ đọc</p>
              <p className="text-xs text-amber-700">
                Chỉ người quản lý (Manager / Admin) mới có quyền chỉnh sửa điều khoản và thông tin mẫu hợp đồng. Nhân viên chỉ xem cấu hình hiện tại.
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
                    helperText="Đoạn văn mở đầu trước bảng danh sách sản phẩm"
                  />

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
                      Nội dung điều khoản sẽ tự động được áp dụng khi lập hợp đồng mới.
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

            {/* Bản xem trước hợp đồng dạng web */}
            <div className="space-y-4 lg:col-span-6">
              <Card
                title="Bản xem trước hợp đồng"
                description="Bố cục thực tế của hợp đồng khi hiển thị và in ấn trên giao diện web."
              >
                <div className="max-h-[75vh] overflow-y-auto rounded-xl border border-gray-300 bg-white p-6 text-gray-900 shadow-inner">
                  {/* Header */}
                  <div className="border-b border-gray-300 pb-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="text-[11px] font-semibold text-gray-500">
                      Độc lập - Tự do - Hạnh phúc
                    </p>
                    <div className="mx-auto my-2 h-[1px] w-24 bg-gray-400" />
                    <h2 className="mt-3 text-base font-black tracking-wide text-gray-900 uppercase">
                      {template.title || 'HỢP ĐỒNG DỊCH VỤ KÝ GỬI THỜI TRANG'}
                    </h2>
                    <p className="text-xs font-semibold text-gray-600">
                      Số: HD-20261115-DEMO
                    </p>
                  </div>

                  {/* Bên A & Bên B */}
                  <div className="mt-4 space-y-3 text-xs">
                    <div>
                      <p className="font-extrabold text-gray-900 uppercase">
                        BÊN A (BÊN NHẬN KÝ GỬI): {template.organizationName}
                      </p>
                      <p className="text-gray-600">
                        Địa chỉ: 123 Đường Thời Trang, Quận 1, TP. Hồ Chí Minh
                      </p>
                      <p className="text-gray-600">
                        Hotline: 1900 6868 · Website: ocs.fashion.vn
                      </p>
                    </div>

                    <div>
                      <p className="font-extrabold text-gray-900 uppercase">
                        BÊN B (BÊN KÝ GỬI): NGUYỄN VĂN A
                      </p>
                      <p className="text-gray-600">
                        Số điện thoại: 0912 345 678 · CCCD: 079201000123
                      </p>
                    </div>

                    {template.headerText && (
                      <p className="italic text-gray-700">
                        {template.headerText}
                      </p>
                    )}

                    {/* Danh sách sản phẩm mô phỏng */}
                    <div>
                      <p className="font-bold text-gray-900">
                        DANH SÁCH HÀNG HÓA KÝ GỬI (MÔ PHỎNG):
                      </p>
                      <table className="mt-2 w-full border-collapse border border-gray-300 text-[10px]">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700">
                            <th className="border border-gray-300 p-1">STT</th>
                            <th className="border border-gray-300 p-1">Tên sản phẩm</th>
                            <th className="border border-gray-300 p-1">Mã barcode</th>
                            <th className="border border-gray-300 p-1">Giá niêm yết</th>
                            <th className="border border-gray-300 p-1">Hoa hồng</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 p-1 text-center">1</td>
                            <td className="border border-gray-300 p-1 font-semibold">Áo Khoác Bomber Zara Man</td>
                            <td className="border border-gray-300 p-1 font-mono text-center">OCS-001234</td>
                            <td className="border border-gray-300 p-1 text-right">450.000 đ</td>
                            <td className="border border-gray-300 p-1 text-center">20%</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="mt-1 text-[9px] text-gray-500 italic">
                        * Bản in hợp đồng web hiển thị đầy đủ thông số kỹ thuật, không kèm ảnh sản phẩm.
                      </p>
                    </div>

                    {/* Điều khoản */}
                    <div className="pt-2">
                      <p className="font-bold text-gray-900 uppercase">
                        ĐIỀU KHOẢN HỢP ĐỒNG:
                      </p>
                      <div className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-800 border border-gray-200">
                        {template.defaultTerms}
                      </div>
                    </div>

                    {/* Footer note */}
                    {template.footerText && (
                      <p className="italic text-[11px] text-gray-600">
                        {template.footerText}
                      </p>
                    )}

                    {/* Signature blocks */}
                    <div className="grid grid-cols-2 pt-4 text-center text-xs">
                      <div>
                        <p className="font-bold uppercase text-gray-800">ĐẠI DIỆN BÊN A</p>
                        <p className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
                        <div className="h-14" />
                        <p className="font-bold text-gray-800">Nhân viên tiếp nhận</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase text-gray-800">ĐẠI DIỆN BÊN B</p>
                        <p className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
                        <div className="h-14" />
                        <p className="font-bold text-gray-800">Khách hàng ký gửi</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </ContractPageLayout>
  );
}
