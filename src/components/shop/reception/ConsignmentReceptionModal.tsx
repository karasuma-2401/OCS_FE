import React, { useState, useMemo } from 'react';
import { findContractCustomer, getContractCustomer, updateContractCustomer, type ContractCustomer, type ContractImage } from '@/api/contracts';
import { parseProblemDetails } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Combobox, Input } from '@/components/shared';
import { ContractSignature } from '@/components/shop/ContractSignature';
import {
  X,
  FileText,
  UserCheck,
  Lock,
  Tag,
  Coins,
  Receipt,
  Save,
  Heart,
  ShoppingBag,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type {
  Appointment,
  ReceptionContractResult,
} from '@/types';
import { ItemPhotoModal } from './ItemPhotoModal';
import { ReceptionPrintModal, BUYOUT_RECEPTION_TERMS } from './ReceptionPrintModal';
import {
  DEFAULT_BRANDS,
  COMMON_MATERIALS,
  COMMON_SIZES,
  consignmentApi,
  getTierDefaultCommissionRate,
  type CategoryOption,
  type BrandOption,
  type ReceptionTemplate,
  type ReceptionDraft,
} from '@/api/consignmentApi';

type CustomerExtra = { identityNumber: string; address: string; bankCode: string; bankAccountNumber: string; bankAccountHolderName: string };
const emptyExtra = (): CustomerExtra => ({ identityNumber: '', address: '', bankCode: '', bankAccountNumber: '', bankAccountHolderName: '' });
const extraFields = [['identityNumber', 'CCCD'], ['address', 'Địa chỉ'], ['bankCode', 'Ngân hàng'], ['bankAccountNumber', 'Số tài khoản'], ['bankAccountHolderName', 'Chủ tài khoản']] as const;
export interface ConsignmentItemRow {
  id: string;
  name: string;
  size: string;
  material?: string;
  description?: string;
  category: string;
  categoryId: string;
  brandId: string;
  brand?: string;
  brandTier?: string;
  commissionRate?: number;
  condition: string;
  conditionPercent: number;
  listedPrice: number;
  customerPayout: number;
  images?: string[];
}

interface ConsignmentReceptionModalProps {
  open: boolean;
  onClose: () => void;
  initialAppointment?: Appointment | null;
  onSuccess: (result: ReceptionContractResult) => void;
  embedded?: boolean;
}

export const ConsignmentReceptionModal: React.FC<ConsignmentReceptionModalProps> = ({
  open,
  onClose,
  initialAppointment,
  onSuccess,
  embedded = false,
}) => {
  const { hasPermission, hasRole } = useAuth();
  const canUpdateCustomer = hasRole('Admin') || hasPermission('customers.update');
  const [customerProfile, setCustomerProfile] = useState<ContractCustomer | null>(null);
  const [savedCustomer, setSavedCustomer] = useState<ContractCustomer | null>(null);
  const [newCustomer, setNewCustomer] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [guestExtra, setGuestExtra] = useState<CustomerExtra>(emptyExtra);
  const [signature, setSignature] = useState<ContractImage | null>(null);
  const [readingSignature, setReadingSignature] = useState(false);
  const [receptionTemplate, setReceptionTemplate] = useState<ReceptionTemplate | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);
  const [customerMessage, setCustomerMessage] = useState('');
  const [intakeType, setIntakeType] = useState<'consignment' | 'buyout'>('consignment');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState(
    initialAppointment?.customerName || '',
  );
  const [customerPhone, setCustomerPhone] = useState(
    initialAppointment?.customerPhone || '',
  );
  const [customerEmail, setCustomerEmail] = useState('');
  const [actualItemCount, setActualItemCount] = useState<number>(
    initialAppointment?.estimatedItemCount || 1,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customerHistoryCount, setCustomerHistoryCount] = useState<number>(0);
  const [termDays, setTermDays] = useState<number>(60);
  const [termDaysInput, setTermDaysInput] = useState<string>('60');
  const [commissionShop, setCommissionShop] = useState<number>(20);

  const handleTermDaysChange = (value: number, syncInput = true) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.max(1, Math.min(60, Math.round(value)));
    setTermDays(clamped);
    if (syncInput) {
      setTermDaysInput(String(clamped));
    }
  };

  const [batchNote, setBatchNote] = useState(
    initialAppointment?.note || '',
  );
  const [items, setItems] = useState<ConsignmentItemRow[]>([]);
  const [photoModalItem, setPhotoModalItem] = useState<ConsignmentItemRow | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaveSuccess, setDraftSaveSuccess] = useState(false);
  const [draftBanner, setDraftBanner] = useState<{
    draftId: string;
    savedAt: string;
    itemCount: number;
    data: ReceptionDraft;
  } | null>(null);
  const [createdContract, setCreatedContract] = useState<ReceptionContractResult | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const customerDirty = Boolean(customerProfile && savedCustomer && (customerEmail !== (savedCustomer.email || '') || extraFields.some(([field]) => (customerProfile[field] || '') !== (savedCustomer[field] || ''))));
  const customerExtra: CustomerExtra = customerProfile ? { identityNumber: customerProfile.identityNumber || '', address: customerProfile.address || '', bankCode: customerProfile.bankCode || '', bankAccountNumber: customerProfile.bankAccountNumber || '', bankAccountHolderName: customerProfile.bankAccountHolderName || '' } : guestExtra;
  const lookupCustomer = async () => {
    const phone = customerPhone.trim();
    if (!/^0\d{9}$/.test(phone)) { setCustomerMessage('Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0.'); return; }
    setLookingUpCustomer(true); setCustomerMessage(''); setCustomerProfile(null); setSavedCustomer(null); setNewCustomer(false); setVerifiedPhone('');
    try {
      const found = await findContractCustomer(phone);
      setCustomerProfile(found); setSavedCustomer(found); setCustomerName(found.fullName); setCustomerPhone(found.phoneNumber); setCustomerEmail(found.email || '');
      setVerifiedPhone(phone); setCustomerMessage('Đã tìm thấy hồ sơ khách hàng.');
    } catch (error) {
      if (parseProblemDetails(error).status === 404) { setNewCustomer(true); setVerifiedPhone(phone); setCustomerMessage('Chưa có hồ sơ. Hãy nhập thông tin khách hàng mới.'); }
      else setCustomerMessage('Không thể tra cứu khách hàng. Vui lòng thử lại.');
    } finally { setLookingUpCustomer(false); }
  };
  const saveCustomerProfile = async () => {
    if (!customerProfile || !customerDirty) return;
    setLookingUpCustomer(true); setCustomerMessage('');
    try {
      const updated = await updateContractCustomer({ ...customerProfile, email: customerEmail });
      setCustomerProfile(updated); setSavedCustomer(updated); setCustomerEmail(updated.email || ''); setCustomerMessage('Đã cập nhật hồ sơ khách hàng.');
    } catch (error) { setCustomerMessage(parseProblemDetails(error).title || 'Không thể cập nhật hồ sơ khách hàng.'); }
    finally { setLookingUpCustomer(false); }
  };
  const reloadAppointmentCustomer = async () => {
    if (!initialAppointment) return;
    setLookingUpCustomer(true); setCustomerMessage('');
    try {
      const found = await getContractCustomer(initialAppointment.customerId);
      setCustomerProfile(found); setSavedCustomer(found); setCustomerName(found.fullName); setCustomerPhone(found.phoneNumber); setCustomerEmail(found.email || '');
    } catch { setCustomerMessage('Không thể tải hồ sơ khách hàng. Vui lòng thử lại.'); }
    finally { setLookingUpCustomer(false); }
  };  const handleItemImagesChange = (itemId: string, newImages: string[]) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, images: newImages } : i)),
    );
    setPhotoModalItem((curr) =>
      curr && curr.id === itemId ? { ...curr, images: newImages } : curr,
    );
  };
  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setApiError(null);
    setDraftSaveSuccess(false);
    const initialCommission = 20;
    setCommissionShop(initialCommission);
    setTermDays(60);
    setTermDaysInput('60');
    setItems([]);

    const loadAndInit = async () => {
      try {
        const [fetchedCats, fetchedBrands] = await Promise.all([
          consignmentApi.getCategories(),
          consignmentApi.getBrands(),
        ]);
        if (!cancelled) {
          setCategories(fetchedCats);

        }
        if (!cancelled) {
          setBrands(fetchedBrands);

        }
        if (!cancelled && (!fetchedCats.length || !fetchedBrands.length)) setApiError('Chưa có danh mục hoặc thương hiệu đang hoạt động. Vui lòng cập nhật danh mục trước khi tiếp nhận.');
      } catch {
        if (!cancelled) { setCategories([]); setBrands([]); setApiError('Không thể tải danh mục hoặc thương hiệu. Vui lòng tải lại trang trước khi tiếp nhận.'); }
      }

      if (cancelled) return;
      if (initialAppointment) {
        setCustomerName(initialAppointment.customerName || '');
        setCustomerPhone(initialAppointment.customerPhone || '');
        setCustomerEmail('');
        getContractCustomer(initialAppointment.customerId).then(found => { if (!cancelled) { setCustomerProfile(found); setSavedCustomer(found); setCustomerName(found.fullName); setCustomerPhone(found.phoneNumber); setCustomerEmail(found.email || ''); } }).catch(() => { if (!cancelled) setCustomerMessage('Không thể tải hồ sơ khách hàng. Vui lòng thử tải lại.'); });
        setBatchNote(initialAppointment.note || '');
        setActiveDraftId(null);
        setDraftBanner(null);

        consignmentApi
          .getCustomerItemHistoryCount(
            initialAppointment.customerId,
            initialAppointment.customerPhone,
          )
          .then((cnt) => {
            if (!cancelled) setCustomerHistoryCount(cnt);
          });
        consignmentApi
          .getDraftByAppointment(initialAppointment.id)
          .then((draft) => {
            if (!cancelled && draft && (draft.items?.length > 0 || draft.customerName)) {
              setDraftBanner({
                draftId: draft.draftId,
                savedAt: draft.savedAt,
                itemCount: draft.items?.length || 0,
                data: draft,
              });
            }
          });
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setBatchNote('');
        setCustomerHistoryCount(0);
        setActiveDraftId(null);
        setDraftBanner(null);

        consignmentApi.getLatestWalkInDraft().then((draft) => {
          if (!cancelled && draft && (draft.items?.length > 0 || draft.customerName)) {
            setDraftBanner({
              draftId: draft.draftId,
              savedAt: draft.savedAt,
              itemCount: draft.items?.length || 0,
              data: draft,
            });
          }
        });
      }
    };

    loadAndInit();
    return () => {
      cancelled = true;
    };
  }, [open, initialAppointment]);

  const [submitting, setSubmitting] = useState(false);
  const stats = useMemo(() => {
    const totalCount = items.length;
    const totalListed = items.reduce((sum, item) => sum + item.listedPrice, 0);
    const totalCustomer = items.reduce((sum, item) => sum + item.customerPayout, 0);
    const totalShop = totalListed - totalCustomer;
    return { totalCount, totalListed, totalCustomer, totalShop };
  }, [items]);
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + termDays);
  const formatDateVN = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const dateRangeStr = `${formatDateVN(today)} – ${formatDateVN(endDate)}`;
  const handleRestoreDraft = () => {
    if (!draftBanner) return;
    const d = draftBanner.data;
    setActiveDraftId(d.draftId);
    if (!initialAppointment && d.customerName) setCustomerName(d.customerName);
    if (!initialAppointment && d.customerPhone) setCustomerPhone(d.customerPhone);
    if (!initialAppointment) { setCustomerName(d.customerName || ''); setCustomerPhone(d.customerPhone || ''); setCustomerEmail(d.customerEmail || ''); setNewCustomer(true); setVerifiedPhone(''); setCustomerMessage('Vui lòng tra cứu lại số điện thoại trước khi tiếp tục.'); setSavedCustomer(null); setCustomerProfile(null); setGuestExtra({ identityNumber: d.identityNumber || '', address: d.address || '', bankCode: d.bankCode || '', bankAccountNumber: d.bankAccountNumber || '', bankAccountHolderName: d.bankAccountHolderName || '' }); }
    if (d.actualItemCount && d.actualItemCount > 0) setActualItemCount(d.actualItemCount);
    if (d.intakeType) {
      setIntakeType(d.intakeType.toLowerCase() === 'buyout' ? 'buyout' : 'consignment');
    }
    if (d.termDays) {
      setTermDays(d.termDays);
      setTermDaysInput(String(d.termDays));
    }
    if (d.commissionShop !== undefined) {
      setCommissionShop(d.commissionShop);
    }
    if (d.note) setBatchNote(d.note);
    if (Array.isArray(d.items) && d.items.length > 0) {
      const restoredItems: ConsignmentItemRow[] = d.items.map((it) => {
        const matchedBrand = brands.find((b) => b.id === it.brandId);
        const itemRate =
          it.commissionRate ??
          ((matchedBrand?.defaultCommissionRate ?? 0) > 0
            ? matchedBrand!.defaultCommissionRate
            : getTierDefaultCommissionRate(matchedBrand?.tier));
        return {
          id: it.id || crypto.randomUUID(),
          name: it.name,
          size: it.size || '',
          material: it.material || '',
          category: categories.find((c) => c.id === it.categoryId)?.name || '',
          categoryId: it.categoryId === '00000000-0000-0000-0000-000000000000' ? '' : it.categoryId || '',
          brandId: matchedBrand?.id || '',
          brand: matchedBrand?.name || '',
          brandTier: matchedBrand?.tier,
          commissionRate: itemRate,
          condition: `${it.conditionPercentage ?? 100}%`,
          conditionPercent: it.conditionPercentage ?? 100,
          listedPrice: it.listedPrice || 0,
          customerPayout: Math.round((it.listedPrice || 0) * (d.intakeType?.toLowerCase() === 'buyout' ? 0.5 : (100 - itemRate) / 100)),
          images: it.imageUrls || [],
        };
      });
      setItems(restoredItems);
    }
    setDraftBanner(null);
  };
  const handleDismissDraft = async (deleteOnServer = true) => {
    if (draftBanner && deleteOnServer) {
      try {
        await consignmentApi.deleteDraft(draftBanner.draftId);
        if (initialAppointment?.id) {
          await consignmentApi.deleteDraftByAppointment(initialAppointment.id);
        } else {
          await consignmentApi.deleteWalkInDraft();
        }
      } catch {
      }
    }
    setDraftBanner(null);
  };
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setApiError(null);
    try {
      const payload = {
        draftId: activeDraftId || undefined,
        appointmentId: initialAppointment?.id,
        intakeType: intakeType === 'buyout' ? ('Buyout' as const) : ('Consignment' as const),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        ...customerExtra,
        actualItemCount,
        termDays,
        commissionShop,
        note: batchNote,
        items: items.map((i) => {
          const itemBrand = brands.find((b) => b.id === i.brandId) || brands[0] || DEFAULT_BRANDS[0];
          const rate =
            i.commissionRate ??
            (itemBrand.defaultCommissionRate > 0
              ? itemBrand.defaultCommissionRate
              : getTierDefaultCommissionRate(itemBrand.tier));
          return {
            name: i.name,
            categoryId: i.categoryId || '00000000-0000-0000-0000-000000000000',
            brandId: i.brandId || '00000000-0000-0000-0000-000000000000',
            size: i.size,
            material: i.material?.trim() || '',
            conditionPercentage: i.conditionPercent,
            hasLabel: true,
            approvalStatus: 'Approved' as const,
            listedPrice: i.listedPrice,
            commissionRate: rate,
            purchasePrice: intakeType === 'buyout' ? Math.round(i.listedPrice * 0.5) : undefined,
            coverImageUrl: i.images && i.images.length > 0 ? i.images[0] : undefined,
            imageUrls: i.images && i.images.length > 0 ? i.images : undefined,
          };
        }),
      };
      const res = await consignmentApi.saveDraft(payload);
      setActiveDraftId(res.draftId);
      setDraftSaveSuccess(true);
      setTimeout(() => setDraftSaveSuccess(false), 3000);
    } catch {
      setApiError('Không thể lưu bản nháp lên máy chủ.');
    } finally {
      setSavingDraft(false);
    }
  };
  const handleClosePrintModal = () => {
    setPrintModalOpen(false);
    if (createdContract) {
      onSuccess(createdContract);
    }
    onClose();
  };
  const addItem = () => setItems(current => [...current, {
    id: crypto.randomUUID(), name: '', size: '', material: '', category: '', categoryId: '', brandId: '', brand: '',
    condition: '100%', conditionPercent: 100, listedPrice: 0, customerPayout: 0, images: [],
  }]);
  const updateItem = (id: string, changes: Partial<ConsignmentItemRow>) => setItems(current => current.map(item => {
    if (item.id !== id) return item;
    const next = { ...item, ...changes };
    return { ...next, condition: `${next.conditionPercent}%`, customerPayout: Math.round(next.listedPrice * (intakeType === 'buyout' ? 0.5 : (100 - (next.commissionRate ?? 0)) / 100)) };
  }));
  const handleRemoveItem = async (id: string) => {
    const itemToRemove = items.find((i) => i.id === id);
    if (itemToRemove?.images && itemToRemove.images.length > 0) {
      const remainingImages: string[] = [];
      const failedErrors: string[] = [];

      for (const url of itemToRemove.images) {
        try {
          await consignmentApi.deleteProductImage(url);
        } catch (err: unknown) {
          remainingImages.push(url);
          const axiosErr = err as { response?: { data?: { detail?: string } } };
          failedErrors.push(axiosErr?.response?.data?.detail || 'Không thể xóa ảnh');
        }
      }

      if (remainingImages.length > 0) {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, images: remainingImages } : it)),
        );
        setApiError(`Không thể xóa ${remainingImages.length} ảnh trên R2: ${failedErrors.join('; ')}.`);
        return;
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleOpenPreview = async () => {
    if ((!initialAppointment && verifiedPhone !== customerPhone.trim()) || (initialAppointment && !customerProfile)) { setApiError('Vui lòng tải hoặc tra cứu hồ sơ khách hàng trước khi tiếp tục.'); return; }
    if (customerDirty) { setApiError('Vui lòng cập nhật hồ sơ khách hàng trước khi tiếp tục.'); return; }
    const bank = [customerExtra.bankCode, customerExtra.bankAccountNumber, customerExtra.bankAccountHolderName];
    if (bank.some(x => x.trim()) && bank.some(x => !x.trim())) { setApiError('Vui lòng nhập đủ thông tin tài khoản ngân hàng.'); return; }
    const cleanName = customerName.trim() || initialAppointment?.customerName || '';
    const cleanPhone = customerPhone.trim() || initialAppointment?.customerPhone || '';

    if (!cleanName || !cleanPhone) {
      setApiError('Vui lòng nhập đầy đủ họ tên và số điện thoại chủ ký gửi.');
      return;
    }

    if (items.length === 0) {
      setApiError('Vui lòng thêm ít nhất 1 sản phẩm vào đợt ký gửi trước khi xem lại.');
      return;
    }
    if (!Number.isInteger(actualItemCount) || actualItemCount < items.length || actualItemCount > 500) { setApiError('Số món thực tế phải từ số sản phẩm đã nhập đến tối đa 500.'); return; }

    if (items.some(i => !i.name.trim() || !brands.some(brand => brand.id === i.brandId) || !categories.some(category => category.id === i.categoryId) || !i.size || i.listedPrice <= 0 || i.conditionPercent < 0 || i.conditionPercent > 100 || (intakeType === 'consignment' && (i.commissionRate == null || i.commissionRate < 0 || i.commissionRate > 100)))) {
      setApiError('Vui lòng nhập đủ tên, thương hiệu, danh mục, kích thước, giá và hoa hồng hợp lệ cho từng sản phẩm.'); return;
    }
    setApiError(null);
    setPreviewLoading(true);
    try {
      const template = intakeType === 'consignment' ? await consignmentApi.getReceptionTemplate() : null;
      setReceptionTemplate(template); setSignature(null); setPreviewOpen(true);
    } catch { setApiError('Không thể tải mẫu hợp đồng. Vui lòng thử lại.'); }
    finally { setPreviewLoading(false); }
  };

  React.useEffect(() => {
    setItems(current => current.map(item => ({ ...item, customerPayout: Math.round(item.listedPrice * (intakeType === 'buyout' ? 0.5 : (100 - (item.commissionRate ?? 0)) / 100)) })));
  }, [intakeType]);

  const handleSubmitReception = async () => {
    if (!previewOpen || !signature || readingSignature || submitting) { setApiError('Khách hàng cần xem lại và ký xác nhận trước khi lưu.'); return; }
    if ((!initialAppointment && verifiedPhone !== customerPhone.trim()) || (initialAppointment && !customerProfile)) { setApiError('Vui lòng tải hoặc tra cứu hồ sơ khách hàng trước khi tiếp tục.'); return; }
    if (customerDirty) { setApiError('Vui lòng cập nhật hồ sơ khách hàng trước khi tiếp tục.'); return; }
    const bank = [customerExtra.bankCode, customerExtra.bankAccountNumber, customerExtra.bankAccountHolderName];
    if (bank.some(x => x.trim()) && bank.some(x => !x.trim())) { setApiError('Vui lòng nhập đủ thông tin tài khoản ngân hàng.'); return; }
    const cleanName = customerName.trim() || initialAppointment?.customerName || '';
    const cleanPhone = customerPhone.trim() || initialAppointment?.customerPhone || '';

    if (!cleanName || !cleanPhone) {
      setApiError('Vui lòng nhập đầy đủ họ tên và số điện thoại chủ ký gửi.');
      return;
    }

    if (items.length === 0) {
      setApiError('Vui lòng thêm ít nhất 1 sản phẩm vào đợt ký gửi.');
      return;
    }
    if (!Number.isInteger(actualItemCount) || actualItemCount < items.length || actualItemCount > 500) { setApiError('Số món thực tế phải từ số sản phẩm đã nhập đến tối đa 500.'); return; }

    if (items.some(i => !i.name.trim() || !brands.some(brand => brand.id === i.brandId) || !categories.some(category => category.id === i.categoryId) || !i.size || i.listedPrice <= 0 || i.conditionPercent < 0 || i.conditionPercent > 100 || (intakeType === 'consignment' && (i.commissionRate == null || i.commissionRate < 0 || i.commissionRate > 100)))) {
      setApiError('Vui lòng nhập đủ thông tin hợp lệ cho từng sản phẩm.'); return;
    }
    setSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        appointmentId: initialAppointment?.id,
        intakeType: intakeType === 'buyout' ? ('Buyout' as const) : ('Consignment' as const),
        signature: signature!,
        templateVersion: receptionTemplate?.version,
        customerInfo: {
          fullName: cleanName,
          phoneNumber: cleanPhone,
          email: customerEmail.trim() || undefined,
          ...customerExtra,
        },
        actualItemCount: actualItemCount > 0 ? actualItemCount : items.length,
        expiryHandling: 'Return' as const,
        termDays,
        note: batchNote,
        items: items.map((i) => {
          const itemBrand = brands.find((b) => b.id === i.brandId) || brands[0] || DEFAULT_BRANDS[0];
          const rate =
            i.commissionRate ??
            (itemBrand.defaultCommissionRate > 0
              ? itemBrand.defaultCommissionRate
              : getTierDefaultCommissionRate(itemBrand.tier));
          return {
            name: i.name,
            categoryId: i.categoryId || '00000000-0000-0000-0000-000000000000',
            brandId: i.brandId || '00000000-0000-0000-0000-000000000000',
            size: i.size,
            material: i.material?.trim() || '',
            conditionPercentage: i.conditionPercent,
            hasLabel: true,
            approvalStatus: 'Approved' as const,
            listedPrice: i.listedPrice,
            commissionRate: rate,
            purchasePrice: intakeType === 'buyout' ? Math.round(i.listedPrice * 0.5) : undefined,
            coverImageUrl: i.images && i.images.length > 0 ? i.images[0] : undefined,
            imageUrls: i.images && i.images.length > 0 ? i.images : undefined,
          };
        }),
      };

      const result = await consignmentApi.createReception(payload);
      try {
        if (initialAppointment?.id) {
          await consignmentApi.deleteDraftByAppointment(initialAppointment.id);
        } else {
          await consignmentApi.deleteWalkInDraft();
        }
        if (activeDraftId) {
          await consignmentApi.deleteDraft(activeDraftId);
        }
      } catch {
      }
      setPreviewOpen(false);
      setCreatedContract(result);
      setPrintModalOpen(true);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: {
            detail?: string;
            title?: string;
            message?: string;
            errors?: Record<string, string[]>;
          };
        };
      };
      let msg = '';
      if (axiosErr?.response?.data?.errors) {
        const errorEntries = Object.entries(axiosErr.response.data.errors);
        const errorList = errorEntries.map(([field, errs]) => `${field}: ${errs.join(', ')}`);
        msg = `Lỗi dữ liệu: ${errorList.join(' | ')}`;
      } else if (axiosErr?.response?.status === 404) {
        msg =
          axiosErr?.response?.data?.detail ||
          axiosErr?.response?.data?.message ||
          'Không tìm thấy API tiếp nhận (404 Not Found). Vui lòng restart lại Backend API (.NET) để nhận Controller mới.';
      } else {
        msg =
          axiosErr?.response?.data?.detail ||
          axiosErr?.response?.data?.message ||
          axiosErr?.response?.data?.title ||
          'Không thể kết nối hoặc lưu phiếu tiếp nhận lên máy chủ.';
      }
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  if (!open) return null;

  return (
    <div className={embedded ? "" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"}>
      
      <div className={embedded ? "relative w-full flex flex-col rounded-2xl bg-surface-default shadow-sm border border-border/70 text-text-primary font-sans" : "relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-surface-default shadow-2xl border border-border/70 overflow-hidden text-text-primary font-sans"}>
        
        <div className={`flex items-center justify-between px-8 py-5 border-b border-border/70 bg-surface-default shrink-0 ${embedded ? 'rounded-t-2xl' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight shadow-xs">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-text-primary tracking-tight">
                  Phiếu Tiếp Nhận Ký Gửi
                </h2>
                <span className="rounded-lg bg-brand-pink-light px-3 py-0.5 font-mono text-xs font-bold text-brand-highlight border border-brand-pink-light">
                  {initialAppointment?.trackingNumber
                    ? `#${initialAppointment.trackingNumber}`
                    : 'Tiếp nhận trực tiếp'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Hồ sơ tiếp nhận hàng ký gửi và thỏa thuận tỷ lệ hoa hồng trực tiếp tại quầy
              </p>
            </div>
          </div>

          {!embedded && <button
            type="button"
            onClick={onClose}
            aria-label="Đóng phiếu tiếp nhận"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-dashboard transition"
          >
            <X size={20} />
          </button>}
        </div>

        
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-6 text-xs">
          {apiError && (
            <div className="rounded-2xl border border-state-danger-border bg-state-danger-soft px-4 py-3 text-xs font-semibold text-state-danger">
              {apiError}
            </div>
          )}

          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">
              Hình thức nhập kho
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setIntakeType('consignment')}
                style={intakeType === 'consignment' ? { color: '#FFFFFF' } : undefined}
                className={`flex h-12 items-center justify-center gap-2.5 rounded-2xl text-xs font-extrabold transition shadow-sm ${
                  intakeType === 'consignment'
                    ? 'bg-brand-pink !text-white ring-2 ring-brand-pink-focus shadow-md'
                    : 'border border-border bg-surface-default text-text-secondary hover:bg-surface-dashboard'
                }`}
              >
                <Heart size={16} className="fill-current" />
                Hàng Ký Gửi (%)
              </button>

              <button
                type="button"
                onClick={() => setIntakeType('buyout')}
                style={intakeType === 'buyout' ? { color: '#FFFFFF' } : undefined}
                className={`flex h-12 items-center justify-center gap-2.5 rounded-2xl text-xs font-extrabold transition shadow-sm ${
                  intakeType === 'buyout'
                    ? 'bg-brand-pink !text-white ring-2 ring-brand-pink-focus shadow-md'
                    : 'border border-border bg-surface-default text-text-secondary hover:bg-surface-dashboard'
                }`}
              >
                <ShoppingBag size={16} />
                Mua Đứt (Vốn shop)
              </button>
            </div>
          </div>

          
          {draftBanner && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-xs text-blue-900 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="text-blue-600 shrink-0" size={17} />
                <div>
                  <span className="font-extrabold text-blue-900">
                    Tìm thấy bản nháp đợt tiếp nhận chưa hoàn tất
                  </span>
                  <span className="text-blue-700 ml-1.5 font-medium">
                    (lưu lúc {new Date(draftBanner.savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                    ngày {new Date(draftBanner.savedAt).toLocaleDateString('vi-VN')} với {draftBanner.itemCount} sản phẩm).
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  style={{ color: '#FFFFFF' }}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 !text-white px-3.5 py-1.5 font-bold text-xs shadow-xs transition active:scale-95"
                >
                  Khôi phục nháp
                </button>
                <button
                  type="button"
                  onClick={() => handleDismissDraft(true)}
                  className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 font-semibold text-xs text-rose-700 hover:bg-rose-100 transition"
                  title="Xóa bản nháp này khỏi máy chủ để không hỏi lại"
                >
                  Bỏ qua & Xóa nháp
                </button>
                <button
                  type="button"
                  onClick={() => handleDismissDraft(false)}
                  className="rounded-xl border border-blue-200 bg-white/80 px-2.5 py-1.5 font-medium text-xs text-blue-700 hover:bg-white transition"
                  title="Tạm ẩn thông báo"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          
          <Card title="Thông tin khách hàng" description={initialAppointment ? 'Hồ sơ khách theo lịch hẹn.' : 'Tra cứu theo số điện thoại trước khi tiếp nhận.'} className="!bg-surface-default !border-border">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Số điện thoại" type="tel" value={customerPhone} disabled={Boolean(initialAppointment) || lookingUpCustomer} onChange={event => { setCustomerPhone(event.target.value); setCustomerProfile(null); setSavedCustomer(null); setNewCustomer(false); setVerifiedPhone(''); setGuestExtra(emptyExtra()); setCustomerName(''); setCustomerEmail(''); setCustomerMessage(''); }} />
              {!initialAppointment && <div className="self-end"><Button variant="outline" loading={lookingUpCustomer} onClick={() => void lookupCustomer()}>Tra cứu khách hàng</Button></div>}
              {(customerProfile || newCustomer || initialAppointment) && <>
                <Input label="Họ và tên" value={customerName} disabled={Boolean(customerProfile || initialAppointment)} onChange={event => setCustomerName(event.target.value)} />
                <Input label="Email" type="email" value={customerEmail} disabled={Boolean(customerProfile) && !canUpdateCustomer} onChange={event => setCustomerEmail(event.target.value)} />
                {extraFields.map(([field, label]) => <Input key={field} label={label} value={customerExtra[field]} disabled={Boolean(customerProfile) && !canUpdateCustomer} onChange={event => { const value = event.target.value; if (customerProfile) setCustomerProfile(current => current ? { ...current, [field]: value } : null); else setGuestExtra(current => ({ ...current, [field]: value })); }} />)}
              </>}
            </div>
            {customerProfile && canUpdateCustomer && <div className="mt-4"><Button variant="outline" disabled={!customerDirty} loading={lookingUpCustomer} onClick={() => void saveCustomerProfile()}>Cập nhật hồ sơ khách hàng</Button><p className="mt-2 text-xs text-muted">Thay đổi email đăng nhập có thể yêu cầu khách kích hoạt lại tài khoản.</p></div>}
            {initialAppointment && !customerProfile && customerMessage && <Button variant="outline" loading={lookingUpCustomer} onClick={() => void reloadAppointmentCustomer()}>Tải lại hồ sơ</Button>}
            {customerMessage && <p role="status" className="mt-3 text-sm text-text-secondary">{customerMessage}</p>}
            {customerHistoryCount > 0 && <p className="mt-2 text-sm text-muted">Khách đã ký gửi {customerHistoryCount} món.</p>}
          </Card>          <Card className="!bg-surface-default !border-border" title="Thông tin đợt ký gửi" description="Thời hạn và số lượng thực tế của đợt tiếp nhận.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Số món thực tế" type="number" min={1} max={500} value={actualItemCount} onChange={event => setActualItemCount(Math.max(1, Number(event.target.value) || 1))} />
              <Input label="Thời hạn (ngày)" type="number" min={1} max={60} value={termDaysInput} onChange={event => { setTermDaysInput(event.target.value); if (event.target.value) handleTermDaysChange(Number(event.target.value), false); }} onBlur={() => handleTermDaysChange(Number(termDaysInput) || 1)} />
              <Input label="Ghi chú đợt" value={batchNote} onChange={event => setBatchNote(event.target.value)} />
            </div>
            <p className="mt-3 text-sm text-muted">{dateRangeStr}</p>
          </Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="rounded-2xl border border-border/80 bg-surface-default p-4.5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-text-muted">
                  Tổng số món tiếp nhận
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-dashboard text-text-muted">
                  <Lock size={15} />
                </div>
              </div>
              <p className="mt-2 text-lg font-extrabold text-text-primary">
                {items.length} / {actualItemCount} món
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-text-muted">
                {initialAppointment
                  ? `Lịch hẹn: ${initialAppointment.estimatedItemCount} • Thực tế: ${actualItemCount} món`
                  : `Đã nhập ${items.length} • Thực tế mang đến: ${actualItemCount} món`}
              </p>
            </div>

            
            <div className="rounded-2xl border border-border/80 bg-surface-default p-4.5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-text-muted">
                  Tổng niêm yết
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-state-info-soft text-state-info">
                  <Tag size={15} />
                </div>
              </div>
              <p className="mt-2 text-lg font-extrabold text-text-primary">
                {formatVND(stats.totalListed)}
              </p>
            </div>

            
            <div className="rounded-2xl border border-brand-pink-light bg-brand-pink-surface p-4.5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-brand-highlight">
                  Dự kiến khách nhận
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight">
                  <Coins size={15} />
                </div>
              </div>
              <p className="mt-2 text-lg font-extrabold text-brand-highlight">
                {formatVND(stats.totalCustomer)}
              </p>
            </div>

            
            <div className="rounded-2xl border border-border/80 bg-surface-default p-4.5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-text-muted">
                  Dự kiến shop thu
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-dashboard text-text-muted">
                  <Receipt size={15} />
                </div>
              </div>
              <p className="mt-2 text-lg font-extrabold text-text-primary">
                {formatVND(stats.totalShop)}
              </p>
            </div>
          </div>

          
          <Card className="!bg-surface-default !border-border" title="Danh sách sản phẩm" description="Tạo sản phẩm trước, sau đó nhập thông tin và ảnh trong từng sản phẩm." actions={<Button variant="outline" onClick={addItem}>Thêm sản phẩm</Button>}>
            {items.length === 0 && <p className="text-sm text-muted">Chưa có sản phẩm. Chọn Thêm sản phẩm để bắt đầu.</p>}
            <div className="space-y-4">
              {items.map((item, index) => <Card key={item.id} className="!bg-surface-default !border-border" title={`Sản phẩm ${index + 1}`} actions={<Button variant="outline" onClick={() => void handleRemoveItem(item.id)}>Xóa</Button>}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input label="Tên sản phẩm" value={item.name} maxLength={200} onChange={event => updateItem(item.id, { name: event.target.value })} />
                  <Combobox label="Thương hiệu" value={item.brandId} placeholder="Chọn thương hiệu" options={brands.map(brand => ({ value: brand.id, label: brand.name }))} onChange={value => { const brand = brands.find(b => b.id === value); if (brand) updateItem(item.id, { brandId: brand.id, brand: brand.name, brandTier: brand.tier, commissionRate: brand.defaultCommissionRate > 0 ? brand.defaultCommissionRate : getTierDefaultCommissionRate(brand.tier) }); }} />
                  <Combobox label="Danh mục" value={item.categoryId} placeholder="Chọn danh mục" options={categories.map(category => ({ value: category.id, label: category.name }))} onChange={value => updateItem(item.id, { categoryId: value, category: categories.find(category => category.id === value)?.name || '' })} />
                  <Combobox label="Kích thước" value={item.size} placeholder="Chọn kích thước" options={COMMON_SIZES.map(value => ({ value, label: value }))} onChange={value => updateItem(item.id, { size: value })} />
                  <Combobox label="Chất liệu" value={item.material || ''} placeholder="Chọn chất liệu" options={COMMON_MATERIALS.map(value => ({ value, label: value }))} onChange={value => updateItem(item.id, { material: value })} />
                  <Input label="Độ mới (%)" type="number" min={0} max={100} value={item.conditionPercent} onChange={event => updateItem(item.id, { conditionPercent: Number(event.target.value) })} />
                  <Input label="Giá niêm yết (đ)" type="number" min={0} value={item.listedPrice || ''} onChange={event => updateItem(item.id, { listedPrice: Number(event.target.value) })} />
                  {intakeType === 'consignment' && <Input label="Hoa hồng shop (%)" type="number" min={0} max={100} step="0.01" value={item.commissionRate ?? ''} onChange={event => updateItem(item.id, { commissionRate: event.target.value === '' ? undefined : Number(event.target.value) })} />}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3"><Button variant="outline" onClick={() => setPhotoModalItem(item)}>Chụp / tải ảnh ({item.images?.length || 0})</Button><span className="text-sm text-muted">Dự kiến khách nhận: {formatVND(item.customerPayout)}</span></div>
                {!!item.images?.length && <div className="mt-3 flex flex-wrap gap-2">{item.images.map(url => <img key={url} src={url} alt={`Ảnh ${item.name || `sản phẩm ${index + 1}`}`} className="h-20 w-20 rounded-lg object-cover" />)}</div>}
              </Card>)}
            </div>
          </Card>
        </div>
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-8 py-5 border-t border-border/70 bg-surface-default shrink-0 ${embedded ? 'rounded-b-2xl' : ''}`}>
          {(!embedded || apiError) && <div className="flex items-center gap-3">
            {!embedded && <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-text-muted hover:text-text-primary transition px-2 py-1"
            >
              Hủy Bỏ
            </button>}
            {apiError && (
              <span className="text-xs font-semibold text-state-danger bg-state-danger-soft px-3 py-1 rounded-xl border border-state-danger-border max-w-md truncate" title={apiError}>
                {apiError}
              </span>
            )}
          </div>}

          <div className="flex items-center gap-3 sm:ml-auto">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="flex items-center gap-2 rounded-2xl border border-border bg-surface-default px-4 py-3 text-xs font-bold text-text-primary hover:bg-surface-dashboard transition shadow-xs disabled:opacity-50"
              title="Lưu tạm đợt tiếp nhận lên máy chủ để khôi phục khi cần"
            >
              {savingDraft ? (
                <>
                  <Loader2 size={15} className="animate-spin text-brand-highlight" /> Đang lưu nháp...
                </>
              ) : draftSaveSuccess ? (
                <>
                  <CheckCircle2 size={15} className="text-emerald-600" /> Đã lưu nháp!
                </>
              ) : (
                <>
                  <Save size={15} /> Lưu Nháp Đợt
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleOpenPreview()}
              disabled={previewLoading}
              className="flex items-center gap-2 rounded-2xl border border-brand-pink/50 bg-brand-pink-light/70 hover:bg-brand-pink-light text-brand-highlight px-5 py-3 text-xs font-extrabold shadow-xs transition active:scale-95"
            >
              <FileText size={15} />
              Xem Lại Phiếu ({items.length} món)
            </button>


          </div>
        </div>
      </div>

      
      {photoModalItem && (
        <ItemPhotoModal
          open={Boolean(photoModalItem)}
          onClose={() => setPhotoModalItem(null)}
          itemName={photoModalItem.name}
          itemCategory={photoModalItem.category}
          itemSize={photoModalItem.size}
          images={photoModalItem.images || []}
          onImagesChange={(newImages) =>
            handleItemImagesChange(photoModalItem.id, newImages)
          }
        />
      )}

      
      {printModalOpen && createdContract && (
        <ReceptionPrintModal
          open={printModalOpen}
          onClose={handleClosePrintModal}
          contract={createdContract}
          items={items}
          commissionShop={commissionShop}
          signature={signature}
          terms={receptionTemplate?.defaultTerms}
          note={batchNote}
          template={receptionTemplate}
          customerDetails={{ email: customerEmail, identity: customerExtra.identityNumber, address: customerExtra.address, bankCode: customerExtra.bankCode, bankAccount: customerExtra.bankAccountNumber, bankHolder: customerExtra.bankAccountHolderName }}
        />
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-surface-default shadow-2xl border border-border/80 overflow-hidden text-text-primary font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-dashboard/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight shadow-xs">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-text-primary">
                    Xem Lại & Đối Soát Phiếu Tiếp Nhận
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Kiểm tra kỹ thông tin khách hàng, số lượng đồ thực tế và mức hoa hồng trước khi lưu phiếu tiếp nhận
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (!submitting) { setSignature(null); setPreviewOpen(false); } }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-default transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border/80 bg-surface-dashboard p-4 space-y-2">
                  <h4 className="font-extrabold text-text-primary text-xs uppercase tracking-wider text-brand-highlight flex items-center gap-1.5">
                    <UserCheck size={14} /> Thông tin khách hàng & Tiếp nhận
                  </h4>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <span className="text-text-muted">Chủ ký gửi:</span>{' '}
                      <strong className="text-text-primary font-extrabold">{customerName}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Số điện thoại:</span>{' '}
                      <strong className="text-text-primary font-extrabold">{customerPhone}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Email:</span>{' '}
                      <span className="text-text-secondary">{customerEmail || 'Chưa cung cấp'}</span>
                    </div>
                    {extraFields.map(([field, label]) => <div key={field}><span className="text-text-muted">{label}:</span> <span className="text-text-secondary">{customerExtra[field] || 'Chưa cung cấp'}</span></div>)}                    <div>
                      <span className="text-text-muted">Hình thức:</span>{' '}
                      <span className="font-bold text-brand-highlight">
                        {intakeType === 'consignment' ? 'Hàng Ký Gửi (%)' : 'Mua Đứt (Vốn shop)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Số lượng đồ thực tế:</span>{' '}
                      <strong className="text-brand-highlight font-extrabold">{actualItemCount} món</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Số món đã nhập:</span>{' '}
                      <strong className="text-text-primary font-bold">{items.length} món</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-surface-dashboard p-4 space-y-2">
                  <h4 className="font-extrabold text-text-primary text-xs uppercase tracking-wider text-brand-highlight flex items-center gap-1.5">
                    <Coins size={14} /> Thỏa thuận hoa hồng & Thời hạn
                  </h4>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <span className="text-text-muted">Thời hạn ký gửi:</span>{' '}
                      <strong className="text-text-primary font-bold">{termDays} ngày</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Khoảng thời gian:</span>{' '}
                      <span className="text-text-secondary font-medium">{dateRangeStr}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-border/50">
                      <span className="text-text-muted">Ghi chú đợt:</span>{' '}
                      <span className="text-text-secondary italic">{batchNote || 'Không có ghi chú'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-text-primary">
                    Danh Sách Sản Phẩm Tiếp Nhận ({items.length} món)
                  </span>
                  <span className="text-text-muted text-[11px]">
                    Được tạo từ phiếu tiếp nhận
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface-default shadow-2xs max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-surface-dashboard/90 backdrop-blur-sm border-b border-border/60">
                      <tr className="text-[11px] font-bold text-text-muted uppercase">
                        <th className="py-2.5 pl-3 w-8">#</th>
                        <th className="py-2.5 px-3">TÊN SẢN PHẨM</th>
                        <th className="py-2.5 px-3">THƯƠNG HIỆU</th>
                        <th className="py-2.5 px-3">PHÂN LOẠI</th>
                        <th className="py-2.5 px-3">SIZE / VẢI</th>
                        <th className="py-2.5 px-3">ĐỘ MỚI</th>
                        <th className="py-2.5 px-3">HOA HỒNG</th><th className="py-2.5 px-3 text-right">GIÁ NIÊM YẾT</th>
                        <th className="py-2.5 pr-3 text-right">KHÁCH NHẬN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {items.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-surface-active/50">
                          <td className="py-2.5 pl-3 font-semibold text-text-muted">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-text-primary">{it.name}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{it.brand || 'Khác'}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{it.category}</td>
                          <td className="py-2.5 px-3 text-text-muted font-medium">
                            {it.size}{it.material ? ` • ${it.material}` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">{it.condition}</td>
                          <td className="py-2.5 px-3">{intakeType === 'consignment' ? `${it.commissionRate}%` : '—'}</td><td className="py-2.5 px-3 text-right font-bold text-text-primary">
                            {formatVND(it.listedPrice)}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-extrabold text-brand-highlight">
                            {formatVND(it.customerPayout)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {items.some(item => item.images?.length) && <Card title="Ảnh sản phẩm trong hợp đồng">{items.filter(item => item.images?.length).map(item => <div key={item.id} className="mb-3"><p className="mb-2 font-bold text-text-primary">{item.name}</p><div className="flex flex-wrap gap-2">{item.images?.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${item.name} - ảnh ${index + 1}`} className="h-24 w-24 rounded-lg object-cover" />)}</div></div>)}</Card>}
              {intakeType === 'buyout' && <Card className="!bg-surface-default !border-border" title="Xác nhận thu mua"><p className="text-sm text-text-secondary">{BUYOUT_RECEPTION_TERMS}</p></Card>}
              {receptionTemplate && <Card className="!bg-surface-default !border-border" title={receptionTemplate.title} description={receptionTemplate.organizationName}>
                {receptionTemplate.headerText && <p className="whitespace-pre-wrap text-sm text-text-primary">{receptionTemplate.headerText}</p>}
                <h4 className="mt-3 font-bold text-text-primary">Điều khoản hợp đồng</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{receptionTemplate.defaultTerms || 'Chưa có điều khoản bổ sung.'}</p>
                {receptionTemplate.footerText && <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{receptionTemplate.footerText}</p>}
              </Card>}
              <ContractSignature value={signature} onChange={setSignature} disabled={submitting || readingSignature} onReadingChange={setReadingSignature} />
              {apiError && <p role="alert" className="text-sm text-state-danger">{apiError}</p>}
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/80 bg-surface-dashboard/60 p-4 text-center">
                <div>
                  <p className="text-[11px] text-text-muted font-semibold">Tổng giá niêm yết</p>
                  <p className="text-base font-extrabold text-text-primary mt-0.5">{formatVND(stats.totalListed)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-brand-highlight font-semibold">Tiền dự kiến khách nhận</p>
                  <p className="text-base font-extrabold text-brand-highlight mt-0.5">{formatVND(stats.totalCustomer)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted font-semibold">Hoa hồng shop dự kiến</p>
                  <p className="text-base font-extrabold text-text-primary mt-0.5">{formatVND(stats.totalShop)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border/70 bg-surface-default shrink-0">
              <button
                type="button"
                onClick={() => { if (!submitting) { setSignature(null); setPreviewOpen(false); } }}
                className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface-default hover:bg-surface-dashboard px-4 py-2.5 text-xs font-bold text-text-secondary transition"
              >
                <RotateCcw size={14} /> Quay lại chỉnh sửa
              </button>

              <button
                type="button"
                onClick={handleSubmitReception}
                disabled={submitting || readingSignature || !signature}
                style={{ color: '#FFFFFF' }}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-pink to-brand-pink-hover hover:opacity-95 px-6 py-2.5 text-xs font-extrabold !text-white shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-white" /> Đang lưu phiếu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} className="text-white" /> Xác Nhận & Lưu Phiếu Tiếp Nhận
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
