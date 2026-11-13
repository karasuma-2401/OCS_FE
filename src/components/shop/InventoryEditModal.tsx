import { useState, type FormEvent } from 'react';
import { Button, Combobox, Input, Modal } from '@/components/shared';
import { inventoryApi, type InventoryLocation, type InventoryProduct } from '@/api/inventory';

export function InventoryEditModal({ product, locations, canEditDetails, canEditLocation, canOffer, onClose, onUpdated, onStale }: {
  product: InventoryProduct;
  locations: InventoryLocation[];
  canEditDetails: boolean;
  canEditLocation: boolean;
  canOffer: boolean;
  onClose: () => void;
  onUpdated: (product: InventoryProduct) => void;
  onStale: () => void;
}) {
  const [current, setCurrent] = useState(product);
  const [name, setName] = useState(product.name);
  const [size, setSize] = useState(product.size);
  const [description, setDescription] = useState(product.description ?? '');
  const [condition, setCondition] = useState(String(product.conditionPercentage));
  const [location, setLocation] = useState(product.location?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const detailsChanged = name.trim() !== current.name || size.trim() !== current.size || description.trim() !== (current.description ?? '') || Number(condition) !== current.conditionPercentage;
  const locationChanged = Boolean(location && location !== current.location?.id);
  const closeEditor = () => {
    if ((canEditDetails && detailsChanged) || (canEditLocation && locationChanged)) {
      if (!window.confirm('Bạn còn thay đổi chưa lưu. Đóng hộp thoại và bỏ các thay đổi này?')) return;
    }
    onClose();
  };

  async function save(operation: () => Promise<InventoryProduct>, success: string) {
    if (busy || stale) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const updated = await operation();
      setCurrent(updated);
      onUpdated(updated);
      setMessage(success);
    } catch (caught) {
      const problem = caught as { response?: { status?: number; data?: { title?: string; code?: string } } };
      if (problem.response?.status === 409 && problem.response.data?.code === 'INVENTORY.CONFLICT') {
        setStale(true); onStale();
        setError('Không thể lưu do dữ liệu hoặc trạng thái đã thay đổi. Hãy đóng hộp thoại, kiểm tra lại sản phẩm và mở lại để tiếp tục.');
      } else setError(problem.response?.status === 403 ? 'Tài khoản không có quyền thực hiện thao tác này.' : problem.response?.data?.title || 'Không thể lưu. Vui lòng thử lại.');
    } finally { setBusy(false); }
  }

  const saveDetails = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !size.trim() || condition === '' || !Number.isInteger(Number(condition)) || Number(condition) < 0 || Number(condition) > 100) {
      setError('Nhập tên, kích thước và tình trạng từ 0 đến 100%.'); return;
    }
    void save(() => inventoryApi.changeDetails(current.id, current.version, name.trim(), size.trim(), description.trim(), Number(condition)), 'Đã lưu thông tin sản phẩm.');
  };

  return <Modal open onClose={closeEditor} title="Chỉnh sửa sản phẩm" description={`${current.barcode} · Lưu riêng từng phần để cập nhật thông tin hoặc vị trí.`} error={error} disabled={busy} className="max-w-2xl" footer={<Button variant="outline" onClick={closeEditor}>Đóng</Button>}>
    <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
      {message && <p role="status" className="rounded-control bg-state-success/10 p-3 text-sm text-state-success">{message}</p>}
      {canEditDetails && <form onSubmit={saveDetails} className="space-y-4">
        <h3 className="font-semibold text-brand-ink">Thông tin sản phẩm</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Tên sản phẩm" required maxLength={200} value={name} onChange={event => setName(event.target.value)} />
          <Input label="Kích thước" required maxLength={30} value={size} onChange={event => setSize(event.target.value)} />
          <Input label="Tình trạng (%)" type="number" required min={0} max={100} step={1} value={condition} onChange={event => setCondition(event.target.value)} />
        </div>
        <label className="block text-sm font-medium text-text-primary">Mô tả<textarea value={description} maxLength={2000} rows={3} onChange={event => setDescription(event.target.value)} className="mt-1.5 w-full rounded-control border border-border bg-white px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight" /></label>
        <Button type="submit" disabled={!detailsChanged || stale} loading={busy}>Lưu thông tin</Button>
      </form>}
      {canEditLocation && <form className="space-y-3 border-t border-border pt-5" onSubmit={event => { event.preventDefault(); if (location && location !== current.location?.id) void save(() => inventoryApi.changeLocation(current.id, current.version, location), 'Đã cập nhật vị trí kho.'); }}>
        <h3 className="font-semibold text-brand-ink">Sắp xếp vị trí kho</h3>
        <p className="text-sm text-text-secondary">Vị trí hiện tại: {current.location ? `${current.location.code} — ${current.location.name}` : 'Chưa xếp'}</p>
        <Combobox label="Vị trí mới" value={location} onChange={setLocation} placeholder="Chọn vị trí" options={locations.map(place => ({ value: place.id, label: `${place.code} — ${place.name}` }))} />
        {locations.length === 0 && <p className="text-xs text-text-secondary">Chưa có vị trí hoạt động. Liên hệ quản lý để thêm vị trí.</p>}
        <Button type="submit" variant="outline" disabled={!location || location === current.location?.id || stale} loading={busy}>Lưu vị trí</Button>
      </form>}
      <section className="space-y-3 border-t border-border pt-5">
        <h3 className="font-semibold text-brand-ink">Trạng thái bán</h3>
        <p className="text-sm text-text-secondary">Hiện tại: {current.status === 'PendingProcessing' ? 'Chờ xử lý' : current.status === 'OnSale' ? 'Đang bán' : current.status} · {current.approvalStatus === 'Approved' ? 'Đã duyệt' : 'Chưa duyệt'}</p>
        {current.status === 'PendingProcessing' && current.approvalStatus === 'Approved' && canOffer && <Button variant="outline" disabled={stale || !current.location} loading={busy} onClick={() => { if (window.confirm('Đưa sản phẩm này lên bán?')) void save(() => inventoryApi.offer(current.id, current.version), 'Sản phẩm đã được đưa lên bán.'); }}>Đưa lên bán</Button>}
        <p className="text-xs leading-5 text-text-secondary">Cần duyệt và xếp vị trí trước khi đưa lên bán. Trạng thái đã bán hoặc đã trả được cập nhật qua nghiệp vụ tương ứng.</p>
      </section>
      {current.sourceType === 'Consignment' && <p className="text-xs leading-5 text-text-secondary">Giá ký gửi vẫn theo thỏa thuận. Bản PDF hợp đồng đã tạo không tự thay đổi khi sửa thông tin trong kho.</p>}
    </div>
  </Modal>;
}
