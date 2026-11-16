import { useEffect, useState, type FormEvent } from 'react';
import { Clock3, Plus } from 'lucide-react';
import { appointmentApi, type ManagedTimeSlot } from '@/api/appointmentApi';
import { parseProblemDetails } from '@/api/auth';
import { Badge, Button, Card, ErrorState, Input, Modal, Select, SkeletonLoading } from '@/components/shared';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';

type FormState = { startTime: string; endTime: string; maxCustomers: string; isActive: boolean };
const blank = (): FormState => ({ startTime: '', endTime: '', maxCustomers: '5', isActive: true });

export function AppointmentSlotsPage() {
  const [slots, setSlots] = useState<ManagedTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedTimeSlot | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    appointmentApi.getManagedTimeSlots().then(data => { if (active) setSlots(data); })
      .catch(() => { if (active) setError('Không thể tải danh sách khung giờ.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const openEditor = (slot: ManagedTimeSlot | null) => {
    setEditing(slot); setFormError('');
    setForm(slot ? { startTime: slot.startTime.slice(0, 5), endTime: slot.endTime.slice(0, 5), maxCustomers: String(slot.maxCustomers), isActive: slot.isActive } : blank());
    setOpen(true);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const maxCustomers = Number(form.maxCustomers);
    if (!form.startTime || !form.endTime || form.endTime <= form.startTime || !Number.isInteger(maxCustomers) || maxCustomers < 1 || maxCustomers > 200) {
      setFormError('Giờ kết thúc phải sau giờ bắt đầu. Số khách tối đa là số nguyên từ 1 đến 200.'); return;
    }
    setSaving(true); setFormError('');
    try {
      const request = { startTime: `${form.startTime}:00`, endTime: `${form.endTime}:00`, maxCustomers, isActive: form.isActive, expectedUpdatedAt: editing?.updatedAt ?? null };
      if (editing) await appointmentApi.updateTimeSlot(editing.id, request); else await appointmentApi.createTimeSlot(request);
      setOpen(false); setNotice(editing ? 'Đã cập nhật khung giờ.' : 'Đã thêm khung giờ.'); setRetry(value => value + 1);
    } catch (error) {
      const problem = parseProblemDetails(error);
      setFormError(problem.detail || problem.title || 'Không thể lưu khung giờ. Vui lòng thử lại.');
    } finally { setSaving(false); }
  };

  return <ContractPageLayout title="Quản lý khung giờ hẹn" description="Thiết lập giờ tiếp nhận và số khách tối đa cho mỗi khung giờ trong một ngày." backTo="/shop/consignment" backLabel="Lịch hẹn và tiếp nhận">
    <div className="space-y-5">
      {notice && <p role="status" className="rounded-card bg-state-success-soft px-4 py-3 text-sm text-state-success-strong">{notice}</p>}
      <Card title="Khung giờ tiếp nhận" description="Khung giờ đang áp dụng được hiển thị khi khách đặt lịch." actions={<Button startIcon={<Plus size={16} />} onClick={() => openEditor(null)}>Thêm khung giờ</Button>}>
        {loading ? <SkeletonLoading variant="table" columns={4} label="Đang tải khung giờ..." /> : error ? <ErrorState description={error} onRetry={() => setRetry(value => value + 1)} /> : slots.length === 0 ? <div className="py-12 text-center"><Clock3 className="mx-auto mb-3 text-brand-highlight" size={28} aria-hidden="true" /><p className="font-bold text-ink">Chưa có khung giờ tiếp nhận</p><p className="mt-1 text-sm text-muted">Thêm khung giờ đầu tiên để khách có thể đặt lịch.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-brand-pink-surface text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Khung giờ</th><th className="px-4 py-3">Số khách tối đa / ngày</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3"><span className="sr-only">Thao tác</span></th></tr></thead><tbody className="divide-y divide-border">{slots.map(slot => <tr key={slot.id} className="hover:bg-brand-pink-surface/40"><td className="px-4 py-4 font-bold text-ink">{slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}{slot.hasAppointments && <span className="mt-1 block text-xs font-normal text-muted">Đã có lịch hẹn</span>}</td><td className="px-4 py-4 tabular-nums">{slot.maxCustomers} khách</td><td className="px-4 py-4"><Badge variant={slot.isActive ? 'success' : 'neutral'}>{slot.isActive ? 'Đang áp dụng' : 'Ngừng áp dụng'}</Badge></td><td className="px-4 py-4 text-right"><Button variant="outline" size="sm" onClick={() => openEditor(slot)}>Chỉnh sửa</Button></td></tr>)}</tbody></table></div>}
      </Card>
      <p className="text-sm leading-6 text-muted">Ngừng áp dụng sẽ ẩn khung giờ khỏi lượt đặt mới; các lịch đã đặt vẫn được giữ. Với khung giờ đã có lịch, hãy tạo khung giờ mới nếu muốn thay đổi giờ bắt đầu hoặc kết thúc.</p>
    </div>
    <Modal open={open} onClose={() => { if (!saving) setOpen(false); }} title={editing ? 'Chỉnh sửa khung giờ' : 'Thêm khung giờ'} description="Số khách tối đa áp dụng riêng cho từng ngày." disabled={saving} footer={<><Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button><Button type="submit" form="slot-form" loading={saving}>Lưu khung giờ</Button></>}>
      <form id="slot-form" onSubmit={event => void submit(event)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><Input type="time" label="Giờ bắt đầu" required disabled={editing?.hasAppointments} value={form.startTime} onChange={event => setForm({ ...form, startTime: event.target.value })} /><Input type="time" label="Giờ kết thúc" required disabled={editing?.hasAppointments} value={form.endTime} onChange={event => setForm({ ...form, endTime: event.target.value })} /></div>
        {editing?.hasAppointments && <p className="text-xs leading-5 text-muted">Không thể đổi giờ vì đã có lịch hẹn sử dụng khung giờ này.</p>}
        <Input label="Số khách tối đa mỗi ngày" type="number" min={1} max={200} step={1} required value={form.maxCustomers} onChange={event => setForm({ ...form, maxCustomers: event.target.value })} />
        <Select label="Trạng thái" value={form.isActive ? 'active' : 'inactive'} onChange={event => setForm({ ...form, isActive: event.target.value === 'active' })}><option value="active">Đang áp dụng</option><option value="inactive">Ngừng áp dụng</option></Select>
        {formError && <p role="alert" className="rounded-xl bg-state-danger-soft p-3 text-sm text-state-danger">{formError}</p>}
      </form>
    </Modal>
  </ContractPageLayout>;
}
