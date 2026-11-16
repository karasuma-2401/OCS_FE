import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { appointmentApi } from '@/api/appointmentApi';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { ConsignmentReceptionModal } from '@/components/shop/reception';
import { BuyoutReception } from '@/components/shop/buyout/BuyoutReception';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Appointment } from '@/types';

export function ReceptionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const appointmentId = params.get('appointmentId');
  const direct = params.get('direct') === '1';
  const buyout = direct && !appointmentId && params.get('type') === 'buyout';
  const { hasPermission, hasRole } = useAuth();
  const canConsign = hasRole('Admin') || (hasPermission('appointments.staff.reception') && hasPermission('customers.read') && (!appointmentId || hasPermission('appointments.staff.read')));
  const canBuyout = hasPermission('products.read') && hasPermission('products.create');
  const permitted = buyout ? canBuyout : canConsign;
  const fromBuyouts = params.get('from') === 'buyouts';
  const backTo = fromBuyouts ? '/shop/buyouts' : '/shop/consignment';
  const switchIntake = (type: 'consignment' | 'buyout') => navigate(`/shop/reception/new?direct=1&type=${type}${fromBuyouts ? '&from=buyouts' : ''}`);
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
  return <ContractPageLayout title={buyout ? 'Tiếp nhận mua đứt' : 'Tiếp nhận ký gửi'} description={buyout ? 'Tiếp nhận khách hàng, kiểm định sản phẩm và gửi đề nghị thu mua.' : 'Nhập thông tin khách hàng và sản phẩm tiếp nhận.'} icon={buyout ? <ShoppingBag size={22} /> : undefined} activeItem={buyout ? 'buyout' : 'consignment'} backTo={backTo} backLabel={fromBuyouts ? 'Thu mua đứt' : 'Lịch hẹn và tiếp nhận'}>
    {buyout ? <BuyoutReception canInspect={hasPermission('appointments.staff.reception')} canConsign={canConsign} onConsignment={() => switchIntake('consignment')} /> : loading ? <p role="status">Đang tải lịch hẹn...</p> : error || (!appointment && !direct) ? <p role="alert">{error || 'Vui lòng chọn lịch hẹn hoặc tiếp nhận khách trực tiếp.'}</p> : <ConsignmentReceptionModal embedded open initialAppointment={appointment} onBuyout={direct && !appointmentId ? () => switchIntake('buyout') : undefined} canBuyout={canBuyout} onClose={() => navigate(backTo)} onSuccess={() => navigate('/shop/consignment')} />}
  </ContractPageLayout>;
}
