import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appointmentApi } from '@/api/appointmentApi';
import { Badge, Button, Card, Combobox, DatePicker, DetailPanel, DetailSplitLayout, Input, Modal, PageHeaderCard, Table, DetailIconButton, Toast, type TableColumn } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import type { Appointment, AppointmentStatus } from '@/types';

const labels: Record<AppointmentStatus, string> = { Scheduled: 'Đã đặt lịch', CheckedIn: 'Đã đến quầy', Completed: 'Đã tiếp nhận', NoShow: 'Không đến', Cancelled: 'Đã hủy' };
const localDate = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const displayDate = (date: string) => date.split('-').reverse().join('/');

export function AppointmentManagement({ onSwitchRole }: { onSwitchRole?: () => void } = {}) {
  const { hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const canUpdate = hasRole('Admin') || hasPermission('appointments.staff.update');
  const canReceive = hasRole('Admin') || (hasPermission('appointments.staff.reception') && hasPermission('customers.read'));
  const canManage = hasRole('Admin') || hasRole('Manager');
  const [dateMode, setDateMode] = useState<'upcoming' | 'today' | 'date'>('upcoming');
  const [date, setDate] = useState(() => localDate(new Date()));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Appointment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [action, setAction] = useState<'cancel' | 'noshow' | 'restore' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const today = localDate(new Date());
  const selected = items.find(item => item.id === selectedId) || null;

  useEffect(() => {
    let active = true;
    if (dateMode === 'date' && !date) { setItems([]); setLoading(false); return () => { active = false; }; }
    const load = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const data = await appointmentApi.getStaffAppointments({ date: dateMode === 'today' ? today : dateMode === 'date' ? date : undefined, fromDate: dateMode === 'upcoming' ? today : undefined, status: (status || undefined) as AppointmentStatus | undefined });
        if (active) { setItems(data); setError(''); }
      } catch { if (active) setError('Không thể tải lịch hẹn. Vui lòng thử lại.'); }
      finally { if (active && initial) setLoading(false); }
    };
    void load(true);
    const interval = window.setInterval(() => void load(), 15000);
    const focus = () => void load();
    window.addEventListener('focus', focus);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', focus); };
  }, [date, dateMode, status, today, refresh]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    return items.filter(item => !query || [item.customerName, item.customerPhone, item.trackingNumber].some(value => value?.toLocaleLowerCase('vi-VN').includes(query)));
  }, [items, search]);
  const updateStatus = async () => {
    if (!selected || !action || busy) return;
    setBusy(true);
    try {
      const updated = await appointmentApi.updateStatus(selected.id, { status: action === 'cancel' ? 'Cancelled' : action === 'noshow' ? 'NoShow' : 'Scheduled', reason: reason.trim() || undefined });
      setItems(current => current.map(item => item.id === updated.id ? updated : item));
      setAction(null); setReason(''); setNotice(`Đã cập nhật lịch ${updated.trackingNumber}.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ocs:notification:refresh'));
      }
    } catch { setError('Không thể cập nhật lịch hẹn. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };
  const focusDetail = () => {
    if (!window.matchMedia('(max-width: 1279px)').matches) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    detailRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    detailRef.current?.focus({ preventScroll: true });
  };
  const selectAppointment = (item: Appointment) => {
    if (selectedId === item.id) { focusDetail(); return; }
    setSelectedId(item.id);
  };
  useEffect(() => {
    if (selectedId) focusDetail();
  }, [selectedId]);

  const columns: TableColumn<Appointment>[] = [
    { key: 'date', header: 'Ngày và giờ', render: item => <><strong>{displayDate(item.appointmentDate)}</strong><br /><span className="text-xs text-muted">{item.timeSlotDisplay || `${item.startTime} - ${item.endTime}`}</span></> },
    { key: 'tracking', header: 'Mã hẹn', accessor: 'trackingNumber' },
    { key: 'customer', header: 'Khách hàng', render: item => <><strong>{item.customerName}</strong><br /><span className="text-xs text-muted">{item.customerPhone}</span></> },
    { key: 'count', header: 'Số món', accessor: 'estimatedItemCount' },
    { key: 'status', header: 'Trạng thái', render: item => <Badge variant={item.status === 'Completed' ? 'success' : item.status === 'Cancelled' || item.status === 'NoShow' ? 'danger' : 'neutral'}>{labels[item.status]}</Badge> },
    { key: 'action', header: <span className="sr-only">Thao tác</span>, render: item => <DetailIconButton label={`Xem chi tiết lịch ${item.trackingNumber}`} onClick={() => selectAppointment(item)} /> },
  ];

  return <section className="space-y-5" aria-labelledby="appointments-title">
    {notice && <Toast variant="success" title="Thành công" message={notice} onClose={() => setNotice('')} />}
    <PageHeaderCard titleId="appointments-title" icon={<CalendarDays size={24} />} title="Lịch hẹn và tiếp nhận" description="Xem lịch hẹn và tiếp nhận khách ký gửi." actions={<>{onSwitchRole && <Button variant="outline" onClick={onSwitchRole}>Đổi vai trò</Button>}{canManage && <Button variant="outline" onClick={() => navigate('/shop/appointment-slots')}>Quản lý khung giờ</Button>}{canReceive && <Button onClick={() => navigate('/shop/reception/new?direct=1')}>Tiếp nhận khách trực tiếp</Button>}</>} />
    <DetailSplitLayout open={Boolean(selected)}>
      <Card title="Lịch tiếp nhận" description="Mặc định hiển thị lịch từ hôm nay trở đi." className="min-w-0 !bg-surface-default !border-border">
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Combobox label="Thời gian" value={dateMode} onChange={value => setDateMode(value as typeof dateMode)} options={[{ value: 'upcoming', label: 'Tất cả ngày sắp tới' }, { value: 'today', label: 'Hôm nay' }, { value: 'date', label: 'Chọn ngày cụ thể' }]} />
          {dateMode === 'date' && <DatePicker label="Ngày hẹn" value={date} onChange={setDate} />}
          <Combobox label="Trạng thái" value={status} onChange={setStatus} options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} />
          <Input id="appointment-search" label="Tìm lịch hẹn" placeholder="Tên, số điện thoại hoặc mã hẹn" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        {error && <div role="alert" className="mb-3 text-sm text-state-danger">{error} <button className="underline" onClick={() => setRefresh(value => value + 1)}>Thử lại</button></div>}
        <Table columns={columns} data={filtered} rowKey="id" selectedRowKey={selectedId} onRowClick={selectAppointment} loading={loading} emptyTitle="Không có lịch hẹn phù hợp" emptyMessage={dateMode === 'date' && !date ? 'Chọn ngày hẹn để xem lịch.' : 'Thử thay đổi bộ lọc để xem lịch hẹn khác.'} />
      </Card>
      {selected && <DetailPanel panelRef={detailRef} title="Chi tiết lịch hẹn" description="Thông tin và thao tác theo quyền của bạn" disabled={busy} onClose={() => { setSelectedId(null); document.getElementById('appointment-search')?.focus(); }}>
        <div className="p-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted">Mã hẹn</dt><dd className="font-semibold">{selected.trackingNumber}</dd></div>
            <div><dt className="text-muted">Trạng thái</dt><dd>{labels[selected.status]}</dd></div>
            <div><dt className="text-muted">Khách hàng</dt><dd className="font-semibold">{selected.customerName}</dd></div>
            <div><dt className="text-muted">Số điện thoại</dt><dd>{selected.customerPhone}</dd></div>
            <div><dt className="text-muted">Ngày và giờ</dt><dd>{displayDate(selected.appointmentDate)} · {selected.timeSlotDisplay || `${selected.startTime} - ${selected.endTime}`}</dd></div>
            <div><dt className="text-muted">Số món dự kiến</dt><dd>{selected.estimatedItemCount}</dd></div>
            <div className="col-span-2"><dt className="text-muted">Ghi chú</dt><dd>{selected.note || 'Không có'}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            {canUpdate && ['Scheduled', 'CheckedIn', 'NoShow'].includes(selected.status) && <Button variant="outline" onClick={() => { setReason(''); setAction('cancel'); }}>Hủy lịch</Button>}
            {canUpdate && ['Scheduled', 'CheckedIn', 'Cancelled'].includes(selected.status) && <Button variant="outline" onClick={() => { setReason(''); setAction('noshow'); }}>Không đến</Button>}
            {canUpdate && ['Cancelled', 'NoShow'].includes(selected.status) && <Button variant="outline" onClick={() => { setReason(''); setAction('restore'); }}>Đặt lại lịch</Button>}
            {canReceive && ['Scheduled', 'CheckedIn'].includes(selected.status) && <Button onClick={() => navigate('/shop/reception/new?appointmentId=' + encodeURIComponent(selected.id))}>Bắt đầu tiếp nhận</Button>}
          </div>
        </div>
      </DetailPanel>}
    </DetailSplitLayout>
    <Modal open={Boolean(action)} onClose={() => setAction(null)} disabled={busy} title={action === 'cancel' ? 'Xác nhận hủy lịch' : action === 'noshow' ? 'Xác nhận khách không đến' : 'Khôi phục lịch hẹn'} description={selected ? `${selected.trackingNumber} · ${selected.customerName}` : undefined} footer={<><Button variant="outline" onClick={() => setAction(null)} disabled={busy}>Quay lại</Button><Button loading={busy} onClick={() => void updateStatus()}>Xác nhận</Button></>}>
      {action !== 'restore' && <label className="block text-sm font-semibold">Lý do (không bắt buộc)<textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-border p-3" /></label>}
    </Modal>
  </section>;
}
