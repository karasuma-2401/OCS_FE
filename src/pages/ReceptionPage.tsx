import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { appointmentApi } from '@/api/appointmentApi';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { ConsignmentReceptionModal } from '@/components/shop/reception';
import { useAuth } from '@/context/AuthContext';
import type { Appointment } from '@/types';

export function ReceptionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const appointmentId = params.get('appointmentId');
  const direct = params.get('direct') === '1';
  const { hasPermission, hasRole } = useAuth();
  const permitted = hasRole('Admin') || (hasPermission('appointments.staff.reception') && hasPermission('customers.read') && (!appointmentId || hasPermission('appointments.staff.read')));
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(Boolean(appointmentId));
  const [error, setError] = useState('');
  useEffect(() => {
    if (!appointmentId || !permitted) return;
    let active = true;
    setLoading(true);
    appointmentApi.getById(appointmentId).then(value => { if (active) setAppointment(value); }).catch(() => { if (active) setError('Không thể tải lịch hẹn. Vui lòng quay lại và thử lại.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appointmentId, permitted]);
  if (!permitted) return <Navigate to="/unauthorized" replace />;
  return <ContractPageLayout title="Tiếp nhận ký gửi" description="Nhập thông tin khách hàng và sản phẩm tiếp nhận." backTo="/shop/consignment" backLabel="Lịch hẹn và tiếp nhận">
    {loading ? <p role="status">Đang tải lịch hẹn...</p> : error || (!appointment && !direct) ? <p role="alert">{error || 'Vui lòng chọn lịch hẹn hoặc tiếp nhận khách trực tiếp.'}</p> : <ConsignmentReceptionModal embedded open initialAppointment={appointment} onClose={() => navigate('/shop/consignment')} onSuccess={() => navigate('/shop/consignment')} />}
  </ContractPageLayout>;
}
