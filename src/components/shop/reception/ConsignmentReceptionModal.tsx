import React, { useState, useMemo } from 'react';
import { findContractCustomer, getContractCustomer, updateContractCustomer, type ContractCustomer, type ContractImage } from '@/api/contracts';
import { parseProblemDetails } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, Card, Combobox, Input, Select } from '@/components/shared';
import { ContractSignature } from '@/components/shop/ContractSignature';
import { ContractMoneyInput, validReceptionPrice } from '@/components/shop/ContractMoneyInput';
import { UnifiedContractSheet } from '@/components/shop/UnifiedContractSheet';
import { ReceptionIntakeTabs } from './ReceptionIntakeTabs';
import {
  X,
  FileText,
  Lock,
  Tag,
  Coins,
  Receipt,
  Save,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Camera,
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

export interface ItemFormState {
  name: string;
  brandId: string;
  brand: string;
  categoryId: string;
  category: string;
  size: string;
  material: string;
  conditionPercent: number;
  listedPrice: number;
  commissionRate?: number;
  images: string[];
}

const emptyItemForm = (defaultRate = 20): ItemFormState => ({
  name: '',
  brandId: '',
  brand: '',
  categoryId: '',
  category: '',
  size: '',
  material: '',
  conditionPercent: 100,
  listedPrice: 0,
  commissionRate: defaultRate,
  images: [],
});

interface ConsignmentReceptionModalProps {
  open: boolean;
  onClose: () => void;
  initialAppointment?: Appointment | null;
  onSuccess: (result: ReceptionContractResult) => void;
  embedded?: boolean;
  onBuyout?: () => void;
  canBuyout?: boolean;
}

export const ConsignmentReceptionModal: React.FC<ConsignmentReceptionModalProps> = ({
  open,
  onClose,
  initialAppointment,
  onSuccess,
  embedded = false,
  onBuyout,
  canBuyout = true,
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
  const [itemForm, setItemForm] = useState<ItemFormState>(() => emptyItemForm(20));
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFormErrors, setItemFormErrors] = useState<Record<string, string>>({});
  const [photoModalTarget, setPhotoModalTarget] = useState<{
    id: string;
    name: string;
    category?: string;
    size?: string;
    images: string[];
  } | null>(null);
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
  };

  const handleImagesChange = (targetId: string, newImages: string[]) => {
    if (targetId === 'form') {
      setItemForm((prev) => ({ ...prev, images: newImages }));
      setPhotoModalTarget((curr) => (curr && curr.id === 'form' ? { ...curr, images: newImages } : curr));
    } else {
      setItems((prev) => prev.map((i) => (i.id === targetId ? { ...i, images: newImages } : i)));
      setPhotoModalTarget((curr) => (curr && curr.id === targetId ? { ...curr, images: newImages } : curr));
    }
  };

  const handleRemoveFormImage = (url: string) => {
    // Chỉ gỡ ảnh khỏi form tiếp nhận, bảo lưu ảnh trên R2
    setItemForm((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img !== url),
    }));
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
    if (onBuyout && d.intakeType?.toLowerCase() === 'buyout') {
      setApiError('Bản nháp mua đứt này thuộc luồng tiếp nhận cũ. Hãy chọn tab Mua đứt để kiểm định và gửi phiếu chờ quản lý duyệt.');
      return;
    }
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
  const clearItemFormError = (field: string) => {
    setItemFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateItemForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!itemForm.name.trim()) errs.name = 'Vui lòng nhập tên sản phẩm.';
    if (!itemForm.brandId || !brands.some((b) => b.id === itemForm.brandId)) errs.brandId = 'Vui lòng chọn thương hiệu.';
    if (!itemForm.categoryId || !categories.some((c) => c.id === itemForm.categoryId)) errs.categoryId = 'Vui lòng chọn danh mục.';
    if (!itemForm.size) errs.size = 'Vui lòng chọn kích thước.';
    if (!validReceptionPrice(itemForm.listedPrice)) errs.listedPrice = 'Giá niêm yết phải từ 1 đến 999.999.999.999 đồng.';
    if (intakeType === 'consignment' && (itemForm.commissionRate == null || itemForm.commissionRate < 0 || itemForm.commissionRate > 100)) {
      errs.commissionRate = 'Hoa hồng shop từ 0% đến 100%.';
    }
    setItemFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveItemFromForm = () => {
    if (!validateItemForm()) return;

    const brandObj = brands.find((b) => b.id === itemForm.brandId);
    const categoryObj = categories.find((c) => c.id === itemForm.categoryId);
    const resolvedRate =
      itemForm.commissionRate ??
      (brandObj && brandObj.defaultCommissionRate > 0
        ? brandObj.defaultCommissionRate
        : getTierDefaultCommissionRate(brandObj?.tier));

    const payout = Math.round(
      itemForm.listedPrice * (intakeType === 'buyout' ? 0.5 : (100 - resolvedRate) / 100),
    );

    if (editingItemId) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItemId
            ? {
              ...it,
              name: itemForm.name.trim(),
              brandId: itemForm.brandId,
              brand: brandObj?.name || itemForm.brand,
              brandTier: brandObj?.tier,
              categoryId: itemForm.categoryId,
              category: categoryObj?.name || itemForm.category,
              size: itemForm.size,
              material: itemForm.material?.trim() || '',
              condition: `${itemForm.conditionPercent}%`,
              conditionPercent: itemForm.conditionPercent,
              listedPrice: itemForm.listedPrice,
              commissionRate: resolvedRate,
              customerPayout: payout,
              images: itemForm.images,
            }
            : it,
        ),
      );
      setEditingItemId(null);
    } else {
      const newItem: ConsignmentItemRow = {
        id: crypto.randomUUID(),
        name: itemForm.name.trim(),
        brandId: itemForm.brandId,
        brand: brandObj?.name || itemForm.brand,
        brandTier: brandObj?.tier,
        categoryId: itemForm.categoryId,
        category: categoryObj?.name || itemForm.category,
        size: itemForm.size,
        material: itemForm.material?.trim() || '',
        condition: `${itemForm.conditionPercent}%`,
        conditionPercent: itemForm.conditionPercent,
        listedPrice: itemForm.listedPrice,
        commissionRate: resolvedRate,
        customerPayout: payout,
        images: itemForm.images,
      };
      setItems((prev) => {
        const next = [...prev, newItem];
        if (next.length > actualItemCount) {
          setActualItemCount(next.length);
          setActualItemCountInput(String(next.length));
        }
        return next;
      });
    }

    setItemForm(emptyItemForm(commissionShop));
    setItemFormErrors({});
    clearFieldError('items');
  };

  const handleStartEdit = (item: ConsignmentItemRow) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      brandId: item.brandId,
      brand: item.brand || '',
      categoryId: item.categoryId,
      category: item.category || '',
      size: item.size,
      material: item.material || '',
      conditionPercent: item.conditionPercent,
      listedPrice: item.listedPrice,
      commissionRate: item.commissionRate,
      images: item.images || [],
    });
    setItemFormErrors({});
    document.getElementById('reception-item-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setItemForm(emptyItemForm(commissionShop));
    setItemFormErrors({});
  };

  const handleRemoveItem = (id: string) => {
    if (editingItemId === id) {
      handleCancelEdit();
    }
    // Gỡ sản phẩm khỏi danh sách tiếp nhận mà không xóa tệp tin trên R2
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
        if (!validReceptionPrice(i.listedPrice)) errors[`item_price_${i.id}`] = 'Giá niêm yết phải từ 1 đến 999.999.999.999 đồng.';
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
        ? await consignmentApi.getReceptionTemplate()
        : null;
      setReceptionTemplate(template || DEFAULT_RECEPTION_TEMPLATE);
      setSignature(null);
      setPreviewOpen(true);
    } catch {
      setApiError('Không thể tải mẫu hợp đồng hiện hành. Vui lòng thử lại trước khi ký.');
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
        if (!validReceptionPrice(i.listedPrice)) errors[`item_price_${i.id}`] = 'Giá niêm yết phải từ 1 đến 999.999.999.999 đồng.';
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
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-brand-ink">
                  Phiếu tiếp nhận ký gửi
                </h2>
                <Badge variant="info">
                  {initialAppointment?.trackingNumber
                    ? `#${initialAppointment.trackingNumber}`
                    : 'Tiếp nhận trực tiếp'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
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


        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-6 text-base [scrollbar-gutter:stable] pb-12">


          <ReceptionIntakeTabs
            value={intakeType}
            onConsignment={() => setIntakeType('consignment')}
            onBuyout={() => onBuyout ? onBuyout() : setIntakeType('buyout')}
            canBuyout={canBuyout}
            disabled={submitting || savingDraft}
          />
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
              <p className="mt-0.5 text-xs font-medium text-text-muted">
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


          {/* Card Form Thêm / Chỉnh sửa sản phẩm tách riêng */}
          <Card
            id="reception-item-form-section"
            className="!bg-surface-default !border-border"
            title={
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-ink">
                  {editingItemId ? 'Chỉnh sửa thông tin sản phẩm' : 'Thêm sản phẩm tiếp nhận'}
                </span>
                {editingItemId ? (
                  <span className="rounded-lg bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-bold border border-amber-300">
                    Đang chỉnh sửa
                  </span>
                ) : (
                  <span className="rounded-lg bg-brand-pink-light text-brand-highlight px-2.5 py-0.5 text-xs font-bold">
                    Mới
                  </span>
                )}
              </div>
            }
            description="Nhập thông tin sản phẩm và tải ảnh, sau đó bấm thêm để lưu vào danh sách sản phẩm."
            actions={
              editingItemId ? (
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Hủy chỉnh sửa
                </Button>
              ) : (
                itemForm.name || itemForm.brandId || itemForm.listedPrice > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setItemForm(emptyItemForm(commissionShop))}>
                    Làm mới ô nhập
                  </Button>
                ) : null
              )
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Tên sản phẩm *"
                placeholder="VD: Áo khoác dạ nữ dáng dài..."
                value={itemForm.name}
                maxLength={200}
                error={itemFormErrors.name}
                onChange={event => {
                  setItemForm(prev => ({ ...prev, name: event.target.value }));
                  clearItemFormError('name');
                }}
              />
              <Combobox
                label="Thương hiệu *"
                value={itemForm.brandId}
                placeholder="Chọn thương hiệu"
                error={itemFormErrors.brandId}
                options={brands.map(brand => ({ value: brand.id, label: brand.name }))}
                onChange={value => {
                  const brand = brands.find(b => b.id === value);
                  if (brand) {
                    const rate = brand.defaultCommissionRate > 0 ? brand.defaultCommissionRate : getTierDefaultCommissionRate(brand.tier);
                    setItemForm(prev => ({
                      ...prev,
                      brandId: brand.id,
                      brand: brand.name,
                      commissionRate: rate,
                    }));
                    clearItemFormError('brandId');
                  }
                }}
              />
              <Combobox
                label="Danh mục *"
                value={itemForm.categoryId}
                placeholder="Chọn danh mục"
                error={itemFormErrors.categoryId}
                options={categories.map(category => ({ value: category.id, label: category.name }))}
                onChange={value => {
                  const cat = categories.find(c => c.id === value);
                  setItemForm(prev => ({
                    ...prev,
                    categoryId: value,
                    category: cat?.name || '',
                  }));
                  clearItemFormError('categoryId');
                }}
              />
              <Combobox
                label="Kích thước *"
                value={itemForm.size}
                placeholder="Chọn kích thước"
                error={itemFormErrors.size}
                options={COMMON_SIZES.map(value => ({ value, label: value }))}
                onChange={value => {
                  setItemForm(prev => ({ ...prev, size: value }));
                  clearItemFormError('size');
                }}
              />
              <Combobox
                label="Chất liệu"
                value={itemForm.material || ''}
                placeholder="Chọn chất liệu"
                options={COMMON_MATERIALS.map(value => ({ value, label: value }))}
                onChange={value => setItemForm(prev => ({ ...prev, material: value }))}
              />
              <Input
                label="Độ mới (%)"
                type="number"
                min={0}
                max={100}
                value={itemForm.conditionPercent}
                onChange={event => setItemForm(prev => ({ ...prev, conditionPercent: Number(event.target.value) }))}
              />
              <ContractMoneyInput
                label="Giá niêm yết (đ) *"
                value={itemForm.listedPrice || null}
                error={itemFormErrors.listedPrice}
                onChange={val => {
                  setItemForm(prev => ({ ...prev, listedPrice: val ?? 0 }));
                  clearItemFormError('listedPrice');
                }}
              />
              {intakeType === 'consignment' && (
                <Input
                  label="Hoa hồng shop (%)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={itemForm.commissionRate ?? ''}
                  error={itemFormErrors.commissionRate}
                  onChange={event => {
                    setItemForm(prev => ({
                      ...prev,
                      commissionRate: event.target.value === '' ? undefined : Number(event.target.value),
                    }));
                    clearItemFormError('commissionRate');
                  }}
                />
              )}
            </div>

            {/* Live calculate & actions */}
            <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<Camera size={16} />}
                  onClick={() =>
                    setPhotoModalTarget({
                      id: 'form',
                      name: itemForm.name || 'Sản phẩm',
                      category: itemForm.category,
                      size: itemForm.size,
                      images: itemForm.images,
                    })
                  }
                >
                  Chụp / tải ảnh ({itemForm.images.length})
                </Button>
                <div className="rounded-xl bg-brand-pink-surface px-3 py-1.5 border border-brand-pink-light/60">
                  <span className="text-xs text-muted">Dự kiến khách nhận: </span>
                  <span className="text-sm font-extrabold text-brand-highlight">
                    {formatVND(
                      Math.round(
                        itemForm.listedPrice *
                        (intakeType === 'buyout'
                          ? 0.5
                          : (100 - (itemForm.commissionRate ?? commissionShop)) / 100),
                      ),
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {editingItemId && (
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Hủy sửa
                  </Button>
                )}
                <button
                  type="button"
                  onClick={handleSaveItemFromForm}
                  style={{ color: '#FFFFFF' }}
                  className="flex items-center gap-2 rounded-xl bg-[#E53E8A] hover:bg-[#D42B76] !text-white px-5 py-2.5 text-sm font-bold shadow-sm transition active:scale-95"
                >
                  {editingItemId ? (
                    <>
                      <CheckCircle2 size={16} /> Lưu thay đổi
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Thêm sản phẩm
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Thumbnail preview if form has images */}
            {itemForm.images.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <p className="text-xs font-semibold text-text-secondary mb-2">Ảnh sản phẩm đang nhập:</p>
                <div className="flex flex-wrap gap-2.5">
                  {itemForm.images.map((url, idx) => (
                    <div key={url} className="relative group rounded-lg overflow-hidden border border-border">
                      <img src={url} alt={`Ảnh ${idx + 1}`} className="h-16 w-16 object-cover" />
                      <button
                        type="button"
                        onClick={() => void handleRemoveFormImage(url)}
                        title="Xóa ảnh này"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Card Danh sách sản phẩm dạng draft */}
          <Card
            className="!bg-surface-default !border-border"
            title={
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-ink">Danh sách sản phẩm</span>
                <span className="rounded-full bg-brand-pink-light px-2.5 py-0.5 text-xs font-extrabold text-brand-highlight">
                  {items.length} món
                </span>
              </div>
            }
            description="Mỗi lần ấn thêm sản phẩm sẽ được lưu vào danh sách bên dưới. Bạn có thể xem lại, sửa hoặc xóa từng sản phẩm trước khi tạo hợp đồng."
          >
            {fieldErrors.items && (
              <div className="mb-4 rounded-xl border border-state-danger-border bg-state-danger-soft p-3 text-xs font-semibold text-state-danger">
                {fieldErrors.items}
              </div>
            )}

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 px-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-dashboard text-muted mb-3">
                  <Tag size={22} />
                </div>
                <h4 className="text-sm font-bold text-ink">Chưa có sản phẩm nào trong danh sách</h4>
                <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                  Hãy nhập thông tin sản phẩm vào form ở trên rồi bấm nút <strong className="text-brand-highlight">"Thêm sản phẩm"</strong> để bắt đầu tiếp nhận.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-surface-default">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-surface-dashboard text-xs font-bold uppercase tracking-wider text-muted border-b border-border">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">#</th>
                      <th className="py-3 px-3 text-center w-16">Ảnh</th>
                      <th className="py-3 px-4">Tên sản phẩm</th>
                      <th className="py-3 px-3">Thương hiệu</th>
                      <th className="py-3 px-3">Danh mục</th>
                      <th className="py-3 px-3 text-center">Size / Vải</th>
                      <th className="py-3 px-3 text-center">Độ mới</th>
                      <th className="py-3 px-4 text-right">Giá niêm yết</th>
                      <th className="py-3 px-3 text-center">Hoa hồng</th>
                      <th className="py-3 px-4 text-right">Khách nhận</th>
                      <th className="py-3 px-3 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`transition ${editingItemId === item.id
                          ? 'bg-amber-50/70 ring-1 ring-amber-300'
                          : 'hover:bg-brand-pink-surface/30'
                          }`}
                      >
                        <td className="py-3.5 px-3 text-center font-bold text-muted text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {item.images && item.images.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPhotoModalTarget({
                                  id: item.id,
                                  name: item.name,
                                  category: item.category,
                                  size: item.size,
                                  images: item.images || [],
                                })
                              }
                              className="relative group inline-block focus:outline-none"
                              title="Xem / chụp thêm ảnh"
                            >
                              <img
                                src={item.images[0]}
                                alt={item.name}
                                className="h-10 w-10 rounded-lg object-cover border border-border shadow-2xs group-hover:opacity-80 transition"
                              />
                              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E53E8A] px-1 text-[9px] font-bold text-white shadow-xs">
                                {item.images.length}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setPhotoModalTarget({
                                  id: item.id,
                                  name: item.name,
                                  category: item.category,
                                  size: item.size,
                                  images: [],
                                })
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border text-muted hover:border-brand-pink hover:text-brand-highlight hover:bg-brand-pink-surface transition text-xs font-semibold"
                              title="Tải ảnh cho sản phẩm này"
                            >
                              +Ảnh
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-ink">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-block rounded-md bg-surface-dashboard px-2 py-0.5 text-xs font-semibold text-text-secondary border border-border/60">
                            {item.brand || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-text-secondary">
                          {item.category || '—'}
                        </td>
                        <td className="py-3.5 px-3 text-center text-xs text-text-secondary">
                          <span className="font-bold">{item.size || '—'}</span>
                          {item.material && (
                            <span className="text-muted block text-[11px]">{item.material}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center text-xs font-bold text-emerald-700">
                          {item.conditionPercent}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-ink">
                          {formatVND(item.listedPrice)}
                        </td>
                        <td className="py-3.5 px-3 text-center text-xs font-semibold text-text-secondary">
                          {intakeType === 'consignment' ? `${item.commissionRate ?? 20}%` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-brand-highlight">
                          {formatVND(item.customerPayout)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-brand-highlight hover:bg-brand-pink-light/60 transition"
                              title="Chỉnh sửa sản phẩm này"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRemoveItem(item.id)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-state-danger hover:bg-state-danger-soft transition"
                              title="Xóa khỏi danh sách"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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


      {photoModalTarget && (
        <ItemPhotoModal
          open={Boolean(photoModalTarget)}
          onClose={() => setPhotoModalTarget(null)}
          itemName={photoModalTarget.name || 'Sản phẩm'}
          itemCategory={photoModalTarget.category || ''}
          itemSize={photoModalTarget.size || ''}
          images={photoModalTarget.images || []}
          onImagesChange={(newImages) =>
            handleImagesChange(photoModalTarget.id, newImages)
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
