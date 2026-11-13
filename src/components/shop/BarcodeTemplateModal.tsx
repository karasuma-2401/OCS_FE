import { Button, Modal } from '@/components/shared';
import { WordTemplateTools } from './WordTemplateTools';

export function BarcodeTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Modal open={open} onClose={onClose} title="Mẫu phiếu sản phẩm Word"
    description="Thiết kế phiếu thông tin và barcode trong Word." className="max-w-3xl"
    footer={<Button variant="outline" onClick={onClose}>Đóng</Button>}>
    {open && <WordTemplateTools kind="product" />}
  </Modal>;
}
