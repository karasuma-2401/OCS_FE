import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/shared';

export function ReceptionIntakeTabs({ value, onConsignment, onBuyout, disabled = false, canConsign = true, canBuyout = true }: {
  value: 'consignment' | 'buyout';
  onConsignment: () => void;
  onBuyout: () => void;
  disabled?: boolean;
  canConsign?: boolean;
  canBuyout?: boolean;
}) {
  return <div className="space-y-2" role="group" aria-label="Hình thức tiếp nhận">
    <p className="text-xs font-bold text-text-secondary">Hình thức tiếp nhận</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <Button variant={value === 'consignment' ? 'primary' : 'outline'} aria-pressed={value === 'consignment'} disabled={disabled || !canConsign} onClick={onConsignment} startIcon={<Heart size={16} />} className="min-h-12">Hàng ký gửi (%)</Button>
      <Button variant={value === 'buyout' ? 'primary' : 'outline'} aria-pressed={value === 'buyout'} disabled={disabled || !canBuyout} onClick={onBuyout} startIcon={<ShoppingBag size={16} />} className="min-h-12">Mua đứt (Vốn shop)</Button>
    </div>
  </div>;
}
