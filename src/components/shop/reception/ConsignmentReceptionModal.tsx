import React, { useState, useMemo } from 'react';
import { findContractCustomer, getContractCustomer, updateContractCustomer, type ContractCustomer, type ContractImage } from '@/api/contracts';
import { parseProblemDetails } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Combobox, Input, Select } from '@/components/shared';
import { ContractSignature } from '@/components/shop/ContractSignature';
import { ContractMoneyInput } from '@/components/shop/ContractMoneyInput';
import { UnifiedContractSheet } from '@/components/shop/UnifiedContractSheet';
import {
  X,
  FileText,
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

const DEFAULT_RECEPTION_TEMPLATE: ReceptionTemplate = {
  title: 'HỢP ĐỒNG DỊCH VỤ KÝ GỬI THỜI TRANG',
  organizationName: 'Cửa hàng Old Clothes Store (OCS)',
  headerText: 'Chuỗi Cửa Hàng & Ký Gửi Thời Trang Tuyển Chọn',
  footerText: 'Hợp đồng này được lập thành 02 bản có giá trị pháp lý như nhau.',
  defaultTerms: '1. Bên A nhận giữ và bán hộ hàng hóa theo giá niêm yết đã thỏa thuận.\n2. Phí dịch vụ (hoa hồng) được trừ trực tiếp khi sản phẩm bán thành công.\n3. Khi hết hạn hợp đồng, sản phẩm chưa bán sẽ được xử lý theo thỏa thuận đã cam kết.',
  version: '00000000-0000-0000-0000-000000000000',
};

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
  const { user, hasPermission, hasRole } = useAuth();
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
  const [actualItemCountInput, setActualItemCountInput] = useState<string>(
    String(initialAppointment?.estimatedItemCount || 1),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customerHistoryCount, setCustomerHistoryCount] = useState<number>(0);
  const [termDays, setTermDays] = useState<number>(60);
  const [termDaysInput, setTermDaysInput] = useState<string>('60');
  const [signedAtDate, setSignedAtDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [expiryHandling, setExpiryHandling] = useState<'Return' | 'Donate'>('Return');
  const [commissionShop, setCommissionShop] = useState<number>(20);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleActualItemCountChange = (valStr: string) => {
    setActualItemCountInput(valStr);
    clearFieldError('actualItemCount');
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setActualItemCount(parsed);
    }
  };

  const handleActualItemCountBlur = () => {
    const parsed = parseInt(actualItemCountInput, 10);
    const minAllowed = Math.max(1, items.length);
    const valid = isNaN(parsed) ? minAllowed : Math.min(500, Math.max(minAllowed, parsed));
    setActualItemCount(valid);
    setActualItemCountInput(String(valid));
  };

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
        const [fetchedCats, fetchedBrands, fetchedTemplate] = await Promise.all([
          consignmentApi.getCategories(),
          consignmentApi.getBrands(),
          consignmentApi.getReceptionTemplate().catch(() => null),
        ]);
        if (!cancelled) {
          setCategories(fetchedCats);
          setBrands(fetchedBrands);
          if (fetchedTemplate) {
            setReceptionTemplate(fetchedTemplate);
            if (fetchedTemplate.defaultTermDays) {
              setTermDays(fetchedTemplate.defaultTermDays);
              setTermDaysInput(String(fetchedTemplate.defaultTermDays));
            }
            if (fetchedTemplate.defaultExpiryHandling === 'Donate' || fetchedTemplate.defaultExpiryHandling === 'Return') {
              setExpiryHandling(fetchedTemplate.defaultExpiryHandling);
            }
          }
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
  const signedDateObj = signedAtDate ? new Date(signedAtDate) : new Date();
  const endDate = new Date(signedDateObj);
  endDate.setDate(signedDateObj.getDate() + termDays);
  const formatDateVN = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const dateRangeStr = `Thời hạn: ${formatDateVN(signedDateObj)} – ${formatDateVN(endDate)} (${termDays} ngày)`;
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
  const addItem = () => {
    setItems((current) => {
      const next = [
        ...current,
        {
          id: crypto.randomUUID(),
          name: '',
          size: '',
          material: '',
          category: '',
          categoryId: '',
          brandId: '',
          brand: '',
          condition: '100%',
          conditionPercent: 100,
          listedPrice: 0,
          customerPayout: 0,
          images: [],
        },
      ];
      if (next.length > actualItemCount) {
        setActualItemCount(next.length);
        setActualItemCountInput(String(next.length));
      }
      return next;
    });
    clearFieldError('items');
  };
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
    const errors: Record<string, string> = {};
    const cleanName = customerName.trim() || initialAppointment?.customerName || '';
    const cleanPhone = customerPhone.trim() || initialAppointment?.customerPhone || '';

    if (!cleanPhone) {
      errors.customerPhone = 'Vui lòng nhập số điện thoại chủ ký gửi.';
    } else if (!/^0\d{9}$/.test(cleanPhone)) {
      errors.customerPhone = 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0.';
    } else if (!initialAppointment && verifiedPhone !== cleanPhone) {
      errors.customerPhone = 'Vui lòng tra cứu số điện thoại trước khi tiếp tục.';
    }

    if (!cleanName) {
      errors.customerName = 'Vui lòng nhập đầy đủ họ tên chủ ký gửi.';
    }

    if (customerDirty) {
      errors.customerName = 'Vui lòng bấm cập nhật hồ sơ khách hàng trước khi tiếp tục.';
    }

    const bank = [customerExtra.bankCode, customerExtra.bankAccountNumber, customerExtra.bankAccountHolderName];
    if (bank.some((x) => x.trim()) && bank.some((x) => !x.trim())) {
      if (!customerExtra.bankCode.trim()) errors.bankCode = 'Vui lòng nhập ngân hàng.';
      if (!customerExtra.bankAccountNumber.trim()) errors.bankAccountNumber = 'Vui lòng nhập số tài khoản.';
      if (!customerExtra.bankAccountHolderName.trim()) errors.bankAccountHolderName = 'Vui lòng nhập tên chủ tài khoản.';
    }

    const parsedActual = parseInt(actualItemCountInput, 10);
    if (!Number.isInteger(actualItemCount) || isNaN(parsedActual) || parsedActual < items.length || parsedActual > 500) {
      errors.actualItemCount = `Số món thực tế phải từ ${items.length} đến tối đa 500.`;
    }

    if (items.length === 0) {
      errors.items = 'Vui lòng thêm ít nhất 1 sản phẩm vào đợt ký gửi trước khi xem lại.';
    } else {
      items.forEach((i) => {
        if (!i.name.trim()) errors[`item_name_${i.id}`] = 'Vui lòng nhập tên sản phẩm.';
        if (!i.brandId || !brands.some((brand) => brand.id === i.brandId)) errors[`item_brand_${i.id}`] = 'Vui lòng chọn thương hiệu.';
        if (!i.categoryId || !categories.some((category) => category.id === i.categoryId)) errors[`item_category_${i.id}`] = 'Vui lòng chọn danh mục.';
        if (!i.size) errors[`item_size_${i.id}`] = 'Vui lòng chọn kích thước.';
        if (!i.listedPrice || i.listedPrice <= 0) errors[`item_price_${i.id}`] = 'Giá niêm yết phải lớn hơn 0đ.';
        if (intakeType === 'consignment' && (i.commissionRate == null || i.commissionRate < 0 || i.commissionRate > 100)) {
          errors[`item_commission_${i.id}`] = 'Hoa hồng shop từ 0% đến 100%.';
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setApiError('Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ bên dưới.');
      return;
    }

    setFieldErrors({});
    setApiError(null);
    setPreviewLoading(true);
    try {
      const template = intakeType === 'consignment'
        ? await consignmentApi.getReceptionTemplate().catch(() => DEFAULT_RECEPTION_TEMPLATE)
        : null;
      setReceptionTemplate(template || DEFAULT_RECEPTION_TEMPLATE);
      setSignature(null);
      setPreviewOpen(true);
    } catch {
      setReceptionTemplate(DEFAULT_RECEPTION_TEMPLATE);
      setSignature(null);
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  React.useEffect(() => {
    setItems(current => current.map(item => ({ ...item, customerPayout: Math.round(item.listedPrice * (intakeType === 'buyout' ? 0.5 : (100 - (item.commissionRate ?? 0)) / 100)) })));
  }, [intakeType]);

  const handleSubmitReception = async () => {
    if (!previewOpen || !signature || readingSignature || submitting) {
      setApiError('Khách hàng cần xem lại và ký xác nhận trước khi lưu.');
      return;
    }
    const cleanName = customerName.trim() || initialAppointment?.customerName || '';
    const cleanPhone = customerPhone.trim() || initialAppointment?.customerPhone || '';

    const errors: Record<string, string> = {};
    if (!cleanPhone) {
      errors.customerPhone = 'Vui lòng nhập số điện thoại chủ ký gửi.';
    } else if (!/^0\d{9}$/.test(cleanPhone)) {
      errors.customerPhone = 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0.';
    } else if (!initialAppointment && verifiedPhone !== cleanPhone) {
      errors.customerPhone = 'Vui lòng tra cứu số điện thoại trước khi tiếp tục.';
    }
    if (!cleanName) {
      errors.customerName = 'Vui lòng nhập đầy đủ họ tên chủ ký gửi.';
    }
    if (customerDirty) {
      errors.customerName = 'Vui lòng cập nhật hồ sơ khách hàng trước khi tiếp tục.';
    }
    const bank = [customerExtra.bankCode, customerExtra.bankAccountNumber, customerExtra.bankAccountHolderName];
    if (bank.some((x) => x.trim()) && bank.some((x) => !x.trim())) {
      if (!customerExtra.bankCode.trim()) errors.bankCode = 'Vui lòng nhập ngân hàng.';
      if (!customerExtra.bankAccountNumber.trim()) errors.bankAccountNumber = 'Vui lòng nhập số tài khoản.';
      if (!customerExtra.bankAccountHolderName.trim()) errors.bankAccountHolderName = 'Vui lòng nhập tên chủ tài khoản.';
    }
    const parsedActual = parseInt(actualItemCountInput, 10);
    if (!Number.isInteger(actualItemCount) || isNaN(parsedActual) || parsedActual < items.length || parsedActual > 500) {
      errors.actualItemCount = `Số món thực tế phải từ ${items.length} đến tối đa 500.`;
    }
    if (items.length === 0) {
      errors.items = 'Vui lòng thêm ít nhất 1 sản phẩm vào đợt ký gửi.';
    } else {
      items.forEach((i) => {
        if (!i.name.trim()) errors[`item_name_${i.id}`] = 'Vui lòng nhập tên sản phẩm.';
        if (!i.brandId || !brands.some((b) => b.id === i.brandId)) errors[`item_brand_${i.id}`] = 'Vui lòng chọn thương hiệu.';
        if (!i.categoryId || !categories.some((c) => c.id === i.categoryId)) errors[`item_category_${i.id}`] = 'Vui lòng chọn danh mục.';
        if (!i.size) errors[`item_size_${i.id}`] = 'Vui lòng chọn kích thước.';
        if (!i.listedPrice || i.listedPrice <= 0) errors[`item_price_${i.id}`] = 'Giá niêm yết phải lớn hơn 0đ.';
        if (intakeType === 'consignment' && (i.commissionRate == null || i.commissionRate < 0 || i.commissionRate > 100)) {
          errors[`item_commission_${i.id}`] = 'Hoa hồng shop từ 0% đến 100%.';
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setApiError('Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ.');
      return;
    }
    setFieldErrors({});
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
        expiryHandling: expiryHandling,
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

          
          {/* Card Thông tin khách hàng */}
          <Card title="Thông tin khách hàng" description={initialAppointment ? 'Hồ sơ khách theo lịch hẹn.' : 'Tra cứu theo số điện thoại trước khi tiếp nhận.'} className="!bg-surface-default !border-border">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Số điện thoại"
                type="tel"
                value={customerPhone}
                error={fieldErrors.customerPhone}
                disabled={Boolean(initialAppointment) || lookingUpCustomer}
                onChange={event => {
                  setCustomerPhone(event.target.value);
                  clearFieldError('customerPhone');
                  setCustomerProfile(null);
                  setSavedCustomer(null);
                  setNewCustomer(false);
                  setVerifiedPhone('');
                  setGuestExtra(emptyExtra());
                  setCustomerName('');
                  setCustomerEmail('');
                  setCustomerMessage('');
                }}
              />
              {!initialAppointment && (
                <div className="self-end">
                  <Button variant="outline" loading={lookingUpCustomer} onClick={() => void lookupCustomer()}>Tra cứu khách hàng</Button>
                </div>
              )}
              {(customerProfile || newCustomer || initialAppointment) && <>
                <Input
                  label="Họ và tên"
                  value={customerName}
                  error={fieldErrors.customerName}
                  disabled={Boolean(customerProfile || initialAppointment)}
                  onChange={event => {
                    setCustomerName(event.target.value);
                    clearFieldError('customerName');
                  }}
                />
                <Input
                  label="Email"
                  type="email"
                  value={customerEmail}
                  error={fieldErrors.customerEmail}
                  disabled={Boolean(customerProfile) && !canUpdateCustomer}
                  onChange={event => {
                    setCustomerEmail(event.target.value);
                    clearFieldError('customerEmail');
                  }}
                />
                {extraFields.map(([field, label]) => (
                  <Input
                    key={field}
                    label={label}
                    value={customerExtra[field]}
                    error={fieldErrors[field]}
                    disabled={Boolean(customerProfile) && !canUpdateCustomer}
                    onChange={event => {
                      const value = event.target.value;
                      clearFieldError(field);
                      if (customerProfile) setCustomerProfile(current => current ? { ...current, [field]: value } : null);
                      else setGuestExtra(current => ({ ...current, [field]: value }));
                    }}
                  />
                ))}
              </>}
            </div>
            {customerProfile && canUpdateCustomer && <div className="mt-4"><Button variant="outline" disabled={!customerDirty} loading={lookingUpCustomer} onClick={() => void saveCustomerProfile()}>Cập nhật hồ sơ khách hàng</Button><p className="mt-2 text-xs text-muted">Thay đổi email đăng nhập có thể yêu cầu khách kích hoạt lại tài khoản.</p></div>}
            {initialAppointment && !customerProfile && customerMessage && <Button variant="outline" loading={lookingUpCustomer} onClick={() => void reloadAppointmentCustomer()}>Tải lại hồ sơ</Button>}
            {customerMessage && <p role="status" className="mt-3 text-sm text-text-secondary">{customerMessage}</p>}
            {customerHistoryCount > 0 && <p className="mt-2 text-sm text-muted">Khách đã ký gửi {customerHistoryCount} món.</p>}
          </Card>

          <Card className="!bg-surface-default !border-border" title="Thông tin đợt ký gửi" description="Thời hạn, ngày ký và phương thức xử lý sau thời hạn của đợt tiếp nhận.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Số món thực tế"
                type="text"
                inputMode="numeric"
                error={fieldErrors.actualItemCount}
                value={actualItemCountInput}
                onChange={event => handleActualItemCountChange(event.target.value)}
                onBlur={handleActualItemCountBlur}
              />
              <Input
                label="Ngày ký tiếp nhận"
                type="date"
                value={signedAtDate}
                onChange={event => setSignedAtDate(event.target.value)}
              />
              <Input
                label="Thời hạn (ngày)"
                type="number"
                min={1}
                max={60}
                value={termDaysInput}
                onChange={event => {
                  setTermDaysInput(event.target.value);
                  if (event.target.value) handleTermDaysChange(Number(event.target.value), false);
                }}
                onBlur={() => handleTermDaysChange(Number(termDaysInput) || 1)}
              />
              <Select
                label="Phương thức hoàn trả"
                value={expiryHandling}
                onChange={event => setExpiryHandling(event.target.value as 'Return' | 'Donate')}
              >
                <option value="Return">Khách nhận lại đồ khi hết hạn</option>
                <option value="Donate">Quyên góp từ thiện theo chính sách</option>
              </Select>
              <div className="sm:col-span-2 lg:col-span-4">
                <Input
                  label="Ghi chú đợt"
                  value={batchNote}
                  onChange={event => setBatchNote(event.target.value)}
                  placeholder="Ghi chú thêm về đợt tiếp nhận (nếu có)..."
                />
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-brand-highlight">{dateRangeStr}</p>
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

          
          {/* Card Danh sách sản phẩm */}
          <Card className="!bg-surface-default !border-border" title="Danh sách sản phẩm" description="Tạo sản phẩm trước, sau đó nhập thông tin và ảnh trong từng sản phẩm." actions={<Button variant="outline" onClick={addItem}>Thêm sản phẩm</Button>}>
            {fieldErrors.items && (
              <div className="mb-3 rounded-xl border border-state-danger-border bg-state-danger-soft p-3 text-xs font-semibold text-state-danger">
                {fieldErrors.items}
              </div>
            )}
            {items.length === 0 && <p className="text-sm text-muted">Chưa có sản phẩm. Chọn Thêm sản phẩm để bắt đầu.</p>}
            <div className="space-y-4">
              {items.map((item, index) => <Card key={item.id} className="!bg-surface-default !border-border" title={`Sản phẩm ${index + 1}`} actions={<Button variant="outline" onClick={() => void handleRemoveItem(item.id)}>Xóa</Button>}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Tên sản phẩm"
                    value={item.name}
                    maxLength={200}
                    error={fieldErrors[`item_name_${item.id}`]}
                    onChange={event => {
                      updateItem(item.id, { name: event.target.value });
                      clearFieldError(`item_name_${item.id}`);
                    }}
                  />
                  <Combobox
                    label="Thương hiệu"
                    value={item.brandId}
                    placeholder="Chọn thương hiệu"
                    error={fieldErrors[`item_brand_${item.id}`]}
                    options={brands.map(brand => ({ value: brand.id, label: brand.name }))}
                    onChange={value => {
                      const brand = brands.find(b => b.id === value);
                      if (brand) {
                        updateItem(item.id, {
                          brandId: brand.id,
                          brand: brand.name,
                          brandTier: brand.tier,
                          commissionRate: brand.defaultCommissionRate > 0 ? brand.defaultCommissionRate : getTierDefaultCommissionRate(brand.tier)
                        });
                        clearFieldError(`item_brand_${item.id}`);
                      }
                    }}
                  />
                  <Combobox
                    label="Danh mục"
                    value={item.categoryId}
                    placeholder="Chọn danh mục"
                    error={fieldErrors[`item_category_${item.id}`]}
                    options={categories.map(category => ({ value: category.id, label: category.name }))}
                    onChange={value => {
                      updateItem(item.id, { categoryId: value, category: categories.find(category => category.id === value)?.name || '' });
                      clearFieldError(`item_category_${item.id}`);
                    }}
                  />
                  <Combobox
                    label="Kích thước"
                    value={item.size}
                    placeholder="Chọn kích thước"
                    error={fieldErrors[`item_size_${item.id}`]}
                    options={COMMON_SIZES.map(value => ({ value, label: value }))}
                    onChange={value => {
                      updateItem(item.id, { size: value });
                      clearFieldError(`item_size_${item.id}`);
                    }}
                  />
                  <Combobox
                    label="Chất liệu"
                    value={item.material || ''}
                    placeholder="Chọn chất liệu"
                    options={COMMON_MATERIALS.map(value => ({ value, label: value }))}
                    onChange={value => updateItem(item.id, { material: value })}
                  />
                  <Input
                    label="Độ mới (%)"
                    type="number"
                    min={0}
                    max={100}
                    value={item.conditionPercent}
                    onChange={event => updateItem(item.id, { conditionPercent: Number(event.target.value) })}
                  />
                  <ContractMoneyInput
                    label="Giá niêm yết (đ)"
                    value={item.listedPrice}
                    error={fieldErrors[`item_price_${item.id}`]}
                    onChange={val => {
                      updateItem(item.id, { listedPrice: val || 0 });
                      clearFieldError(`item_price_${item.id}`);
                    }}
                  />
                  {intakeType === 'consignment' && (
                    <Input
                      label="Hoa hồng shop (%)"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={item.commissionRate ?? ''}
                      error={fieldErrors[`item_commission_${item.id}`]}
                      onChange={event => {
                        updateItem(item.id, { commissionRate: event.target.value === '' ? undefined : Number(event.target.value) });
                        clearFieldError(`item_commission_${item.id}`);
                      }}
                    />
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3"><Button variant="outline" onClick={() => setPhotoModalItem(item)}>Chụp / tải ảnh ({item.images?.length || 0})</Button><span className="text-sm text-muted">Dự kiến khách nhận: {formatVND(item.customerPayout)}</span></div>
                {!!item.images?.length && <div className="mt-3 flex flex-wrap gap-2">{item.images.map(url => <img key={url} src={url} alt={`Ảnh ${item.name || `sản phẩm ${index + 1}`}`} className="h-20 w-20 rounded-lg object-cover" />)}</div>}
              </Card>)}
            </div>
          </Card>
        </div>
        {/* Footer controls */}
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
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-surface-default shadow-2xl border border-border/80 overflow-hidden text-text-primary font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-dashboard/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight shadow-xs">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-text-primary">
                    Xem Lại Hợp Đồng & Ký Tên Tiếp Nhận
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Kiểm tra các điều khoản theo hợp đồng mẫu và ký xác nhận trực tiếp vào ô BÊN B bên dưới.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { if (!submitting) { setSignature(null); setPreviewOpen(false); } }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-default transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <UnifiedContractSheet
                title={receptionTemplate?.title || (intakeType === 'buyout' ? 'BIÊN BẢN THU MUA ĐỨT HÀNG HÓA' : 'HỢP ĐỒNG DỊCH VỤ KÝ GỬI THỜI TRANG')}
                organizationName={receptionTemplate?.organizationName || 'CỬA HÀNG OLD CLOTHES STORE (OCS)'}
                headerText={receptionTemplate?.headerText}
                footerText={receptionTemplate?.footerText}
                contractNumber="[TẠO MỚI KHI LƯU]"
                signedAt={signedDateObj.toISOString()}
                endsAt={endDate.toISOString()}
                expiryHandling={expiryHandling}
                employeeName={user?.fullName || 'Nhân viên tiếp nhận'}
                employeeTitle={user?.roles?.[0] || 'Nhân viên tiếp nhận'}
                employeePhone={user?.phoneNumber || null}
                customerName={customerName}
                customerPhone={customerPhone}
                customerEmail={customerEmail || null}
                customerIdentity={customerExtra.identityNumber || null}
                customerAddress={customerExtra.address || null}
                bankCode={customerExtra.bankCode || null}
                bankAccountNumber={customerExtra.bankAccountNumber || null}
                bankAccountHolderName={customerExtra.bankAccountHolderName || null}
                products={items.map((it, idx) => ({
                  id: it.id,
                  name: it.name,
                  barcode: (it as any).barcode || `OCS-AUTO-${idx + 1}`,
                  brandName: it.brand,
                  categoryName: it.category,
                  size: it.size,
                  material: it.material,
                  conditionPercentage: Number(it.condition.replace(/[^0-9]/g, '')) || 95,
                  listedPrice: it.listedPrice,
                  agreedCommissionRate: intakeType === 'consignment' ? it.commissionRate : 0,
                  customerPayout: it.customerPayout,
                }))}
                terms={receptionTemplate?.defaultTerms || (intakeType === 'buyout' ? BUYOUT_RECEPTION_TERMS : undefined)}
                batchNote={batchNote || null}
                isDraftPreview={true}
                signatureNode={
                  <ContractSignature
                    value={signature}
                    onChange={setSignature}
                    disabled={submitting || readingSignature}
                    onReadingChange={setReadingSignature}
                    compact={true}
                  />
                }
              />

              {apiError && <p role="alert" className="text-sm font-semibold text-state-danger text-center">{apiError}</p>}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border/70 bg-surface-default shrink-0">
              <button
                type="button"
                onClick={() => { if (!submitting) { setSignature(null); setPreviewOpen(false); } }}
                className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface-default hover:bg-surface-dashboard px-4 py-2.5 text-xs font-bold text-text-secondary transition"
              >
                <RotateCcw size={14} /> Quay lại chỉnh sửa
              </button>

              <div className="flex items-center gap-3">
                {!signature && (
                  <span className="text-xs text-amber-600 font-semibold italic">
                    * Vui lòng ký tên vào ô BÊN B trên hợp đồng
                  </span>
                )}
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
        </div>
      )}
    </div>
  );
};
