import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, CheckCircle2, ArrowRight } from 'lucide-react';
import type { Buyout } from '@/api/buyouts';
import { Badge, Button, Card } from '@/components/shared';
import { BuyoutCreateForm } from './BuyoutCreateForm';
import { ReceptionIntakeTabs } from '../reception/ReceptionIntakeTabs';

export function BuyoutReception({ canInspect, canConsign, onConsignment }: {
  canInspect: boolean; canConsign: boolean; onConsignment: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Buyout | null>(null);
  const [formKey, setFormKey] = useState(0);
  return <Card className="!bg-white !p-0 overflow-hidden">
    <header className="flex flex-wrap items-start gap-3 border-b border-border px-5 py-5 sm:px-8">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight"><ShoppingBag size={22} /></div>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-bold text-brand-ink">Phiếu tiếp nhận mua đứt</h2><Badge variant="info">Tiếp nhận trực tiếp</Badge></div><p className="mt-1 text-sm text-muted">Kiểm tra món hàng và đề xuất giá mua bằng vốn cửa hàng.</p></div>
    </header>
    <div className="space-y-6 p-5 sm:p-8">
      <ReceptionIntakeTabs value="buyout" onConsignment={onConsignment} onBuyout={() => {}} disabled={busy} canConsign={canConsign} />
      {created ? <section role="status" className="space-y-5 rounded-xl border border-state-success-border bg-state-success-soft p-5">
        <div className="flex items-start gap-3"><CheckCircle2 className="shrink-0 text-state-success-strong" size={24} /><div><h3 className="font-bold text-ink">Đã gửi phiếu {created.buyoutNumber}</h3><p className="mt-1 text-sm text-muted">{created.status === 'Approved' && created.isAutoApproved ? 'Phiếu đã được hệ thống tự duyệt và đang chờ ghi nhận chi tiền.' : created.status === 'Approved' ? 'Phiếu đã được duyệt và đang chờ ghi nhận chi tiền.' : 'Phiếu đang chờ quản lý duyệt.'} Nhân viên ghi nhận khoản tiền đã chi tại trang Thu mua đứt sau khi được duyệt.</p></div></div>
        <dl className="grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-muted">Khách hàng</dt><dd className="mt-1 font-semibold">{created.customerName}</dd></div><div><dt className="text-muted">Sản phẩm</dt><dd className="mt-1 font-semibold">{created.inspection.name}</dd></div><div><dt className="text-muted">Giá mua đề nghị</dt><dd className="mt-1 font-bold text-brand-highlight">{created.purchasePrice.toLocaleString('vi-VN')} ₫</dd></div></dl>
        <div className="flex flex-wrap gap-3"><Button onClick={() => navigate(`/shop/buyouts?view=history&buyoutId=${encodeURIComponent(created.id)}`)} endIcon={<ArrowRight size={16} />}>Xem phiếu vừa lập</Button><Button variant="outline" onClick={() => { setCreated(null); setFormKey(key => key + 1); }}>Tiếp nhận món tiếp theo</Button></div>
      </section> : <BuyoutCreateForm key={formKey} initialInspection={canInspect} canInspect={canInspect} onBusyChange={setBusy} onCreated={setCreated} />}
    </div>
  </Card>;
}
