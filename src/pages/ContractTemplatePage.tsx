import { Card } from '@/components/shared';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { WordTemplateTools } from '@/components/shop/WordTemplateTools';

export function ContractTemplatePage() {
  return <ContractPageLayout
    title="Quản lý mẫu hợp đồng"
    description="Tải và chuẩn bị mẫu hợp đồng bằng Word cho cửa hàng."
    backTo="/shop/contracts"
    backLabel="Quản lý hợp đồng"
  >
    <div className="space-y-5">
      <Card title="Mẫu hợp đồng Word" description="Chỉnh sửa bố cục và nội dung trong tệp .docx.">
        <WordTemplateTools kind="contract" />
      </Card>
      <Card title="Cách chuẩn bị mẫu">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>Tải mẫu Word và mở tệp bằng Microsoft Word.</li>
          <li>Chỉnh bố cục, viết điều khoản và giữ các tham số trong ngoặc vuông để hệ thống điền thông tin.</li>
          <li>Chọn tệp đã chỉnh sửa để kiểm tra, sau đó lưu và sử dụng cho các hợp đồng mới.</li>
        </ol>
      </Card>
    </div>
  </ContractPageLayout>;
}
