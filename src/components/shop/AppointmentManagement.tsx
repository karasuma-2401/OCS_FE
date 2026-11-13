import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentApi } from '@/api/appointmentApi';
import { Badge, Button, Card, Input, Modal, Select, SkeletonLoading, Toast } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import type { Appointment, AppointmentStatus } from '@/types';

const statusLabels: Record<AppointmentStatus, string> = {
  Scheduled: 'Đã đặt lịch', CheckedIn: 'Chờ tiếp nhận', Completed: 'Đã tiếp nhận', NoShow: 'Vắng mặt', Cancelled: 'Đã hủy',
};
const localDate = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const displayDate = (date: string) => date.split('-').reverse().join('/');

export function AppointmentManagement() {
  const { hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const canReceive = hasPermission('appointments.staff.reception');
  const canUpdate = hasPermission('appointments.staff.update');
  const canManage = hasRole('Admin') || hasRole('Manager');
  const [dateMode, setDateMode] = useState<'upcoming' | 'today' | 'date'>('upcoming');
  const [date, setDate] = useState(() => localDate(new Date()));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [cancelMode, setCancelMode] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const today = localDate(new Date());
  const requestedDate = dateMode === 'today' ? today : dateMode === 'date' ? date : undefined;

  useEffect(() => {
    let active = true;
    if (dateMode === 'date' && !requestedDate) { setItems([]); setLoading(false); return () => { active = false; }; }
    setLoading(true); setError('');
    appointmentApi.getStaffAppointments({ date: requestedDate, fromDate: dateMode === 'upcoming' ? today : undefined, status: (status || undefined) as AppointmentStatus | undefined })
      .then(data => { if (active) setItems(data); })
      .catch(() => { if (active) { setItems([]); setError('Không thể tải lịch hẹn. Vui lòng thử lại.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestedDate, dateMode, status, retry, today]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    return items.filter(item => (dateMode !== 'upcoming' || item.appointmentDate >= today) &&
      (!query || [item.customerName, item.customerPhone, item.trackingNumber].some(value => value?.toLocaleLowerCase('vi-VN').includes(query))));
  }, [items, search, dateMode, today]);
  const close = () => { if (!busy) { setSelected(null); setCancelMode(false); setReason(''); setError(''); } };
  const start = async () => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try {
      const reception = await appointmentApi.startReception(selected.id);
      navigate(`/shop/contracts/new?appointmentId=${encodeURIComponent(reception.appointmentId)}`);
    } catch { setError('Không thể bắt đầu tiếp nhận. Hãy kiểm tra trạng thái lịch và thử lại.'); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try {
      const updated = await appointmentApi.updateStatus(selected.id, { status: 'Cancelled', reason: reason.trim() || undefined });
      setItems(current => current.map(item => item.id === updated.id ? updated : item));
      setSelected(null); setCancelMode(false); setReason(''); setNotice(`Đã hủy lịch ${updated.trackingNumber}.`);
    } catch { setError('Không thể hủy lịch hẹn. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    {notice && <Toast variant="success" title="Thành công" message={notice} onClose={() => setNotice('')} />}
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">Lịch hẹn và tiếp nhận</h1><p className="mt-1 text-sm text-muted">Xem lịch sắp tới và chọn lịch để tiếp nhận khách.</p></div>
      <div className="flex flex-wrap gap-2">{canManage && <Button variant="outline" onClick={() => navigate('/shop/appointment-slots')}>Quản lý khung giờ</Button>}{canReceive && <Button onClick={() => navigate('/shop/contracts/new?direct=1')}>Tiếp nhận khách trực tiếp</Button>}</div>
    </div>
    <Card title="Lịch tiếp nhận" description="Mặc định hiển thị lịch từ hôm nay trở đi.">
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select label="Thời gian" value={dateMode} onChange={e => setDateMode(e.target.value as typeof dateMode)}><option value="upcoming">Tất cả ngày sắp tới</option><option value="today">Hôm nay</option><option value="date">Chọn ngày cụ thể</option></Select>
        {dateMode === 'date' && <Input label="Ngày hẹn" type="date" value={date} onChange={e => setDate(e.target.value)} />}
        <Select label="Trạng thái" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
        <Input label="Tìm lịch hẹn" placeholder="Tên, số điện thoại hoặc mã hẹn" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <SkeletonLoading variant="table" columns={6} label="Đang tải lịch hẹn..." /> : error && !selected ? <div role="alert" className="space-y-3 text-sm text-state-danger"><p>{error}</p><Button variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>Thử lại</Button></div> : filtered.length === 0 ? <p className="py-12 text-center text-sm text-muted">Không có lịch hẹn phù hợp.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-brand-pink-surface text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Ngày và giờ</th><th className="px-4 py-3">Mã hẹn</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Số món</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3"><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody className="divide-y divide-border">{filtered.map(item => <tr key={item.id} className="hover:bg-brand-pink-surface/50"><td className="px-4 py-4"><span className="font-semibold text-ink">{displayDate(item.appointmentDate)}</span><br /><span className="text-xs text-muted">{item.timeSlotDisplay || `${item.startTime} - ${item.endTime}`}</span></td><td className="px-4 py-4">{item.trackingNumber}</td><td className="px-4 py-4"><span className="font-semibold">{item.customerName}</span><br /><span className="text-xs text-muted">{item.customerPhone}</span></td><td className="px-4 py-4">{item.estimatedItemCount}</td><td className="px-4 py-4"><Badge variant={item.status === 'Completed' ? 'success' : item.status === 'Cancelled' || item.status === 'NoShow' ? 'danger' : 'neutral'}>{statusLabels[item.status]}</Badge></td><td className="px-4 py-4 text-right"><Button variant="outline" size="sm" onClick={() => { setSelected(item); setError(''); }}>Chọn lịch</Button></td></tr>)}</tbody></table></div>}
    </Card>
    <Modal open={Boolean(selected)} onClose={close} title={cancelMode ? 'Hủy lịch hẹn' : 'Thông tin tiếp nhận'} description={selected ? `${selected.trackingNumber} · ${selected.customerName}` : undefined} disabled={busy} footer={<><Button variant="outline" onClick={cancelMode ? () => { setCancelMode(false); setError(''); } : close}>Quay lại</Button>{cancelMode ? <Button variant="danger" loading={busy} onClick={() => void cancel()}>Xác nhận hủy lịch</Button> : <>{canUpdate && selected && ['Scheduled', 'CheckedIn'].includes(selected.status) && <Button variant="ghost" onClick={() => setCancelMode(true)}>Hủy lịch</Button>}{canReceive && selected && ['Scheduled', 'CheckedIn'].includes(selected.status) && <Button loading={busy} onClick={() => void start()}>Tiếp nhận và lập hợp đồng</Button>}</>}</>}>
      {selected && <div className="space-y-4"><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted">Khách hàng</dt><dd className="font-semibold">{selected.customerName}</dd></div><div><dt className="text-muted">Số điện thoại</dt><dd className="font-semibold">{selected.customerPhone || '—'}</dd></div><div><dt className="text-muted">Ngày và giờ</dt><dd className="font-semibold">{displayDate(selected.appointmentDate)} · {selected.timeSlotDisplay}</dd></div><div><dt className="text-muted">Số món dự kiến</dt><dd className="font-semibold">{selected.estimatedItemCount}</dd></div><div><dt className="text-muted">Trạng thái</dt><dd>{statusLabels[selected.status]}</dd></div><div><dt className="text-muted">Ghi chú</dt><dd>{selected.note || 'Không có'}</dd></div></dl>{cancelMode && <label className="block text-sm font-semibold">Lý do hủy (không bắt buộc)<textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-border bg-paper p-3 text-sm" /></label>}{error && <p role="alert" className="text-sm text-state-danger">{error}</p>}</div>}
    </Modal>
  </div>;
}
