import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  FileText,
  UserCheck,
  RefreshCw,
  Lock,
  Tag,
  Coins,
  Receipt,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Camera,
  Edit2,
  Trash2,
  Save,
  ArrowRight,
  Heart,
  ShoppingBag,
  Calendar,
  Percent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type {
  Appointment,
  ReceptionContractResult,
} from '@/types';
import { ItemPhotoModal } from './ItemPhotoModal';
import { ReceptionPrintModal } from './ReceptionPrintModal';
import { downloadReceptionTemplate, parseReceptionExcel } from '@/utils/excelImport';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_BRANDS,
  COMMON_MATERIALS,
  COMMON_SIZES,
  consignmentApi,
  getTierDefaultCommissionRate,
  type CategoryOption,
  type BrandOption,
} from '@/api/consignmentApi';

export interface ConsignmentItemRow {
  id: string;
  name: string;
  size: string;
  material?: string;
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
}

export const ConsignmentReceptionModal: React.FC<ConsignmentReceptionModalProps> = ({
  open,
  onClose,
  initialAppointment,
  onSuccess,
}) => {
  const [intakeType, setIntakeType] = useState<'consignment' | 'buyout'>('consignment');
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [brands, setBrands] = useState<BrandOption[]>(DEFAULT_BRANDS);
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
  const [commissionInput, setCommissionInput] = useState<string>('20');
  const commissionCustomer = Math.round((100 - commissionShop) * 100) / 100;

  const handleTermDaysChange = (value: number, syncInput = true) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.max(1, Math.min(60, Math.round(value)));
    setTermDays(clamped);
    if (syncInput) {
      setTermDaysInput(String(clamped));
    }
  };

  const handleCommissionChange = (value: number, syncInput = true) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.max(0, Math.min(100, Math.round(value * 100) / 100));
    setCommissionShop(clamped);
    if (syncInput) {
      setCommissionInput(String(clamped));
    }
    const nextCustomerRate = 100 - clamped;
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        customerPayout: Math.round((item.listedPrice * nextCustomerRate) / 100),
      })),
    );
  };
  const [batchNote, setBatchNote] = useState(
    initialAppointment?.note || '',
  );
  const [quickName, setQuickName] = useState('');
  const [quickBrandId, setQuickBrandId] = useState<string>(DEFAULT_BRANDS[0]?.id || '');
  const [quickCategory, setQuickCategory] = useState(DEFAULT_CATEGORIES[1]?.name || 'Đầm & Váy');
  const [quickSize, setQuickSize] = useState<string>('FreeSize');
  const [quickMaterial, setQuickMaterial] = useState<string>('Cotton');
  const [quickCondition, setQuickCondition] = useState('95% Like New');
  const [quickConditionPercent, setQuickConditionPercent] = useState<number>(95);
  const [quickPrice, setQuickPrice] = useState<string>('');
  const [items, setItems] = useState<ConsignmentItemRow[]>([]);
  const [photoModalItem, setPhotoModalItem] = useState<ConsignmentItemRow | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelFeedback, setExcelFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    warnings?: string[];
  } | null>(null);
  const [showWarningList, setShowWarningList] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaveSuccess, setDraftSaveSuccess] = useState(false);
  const [draftBanner, setDraftBanner] = useState<{
    draftId: string;
    savedAt: string;
    itemCount: number;
    data: any;
  } | null>(null);
  const [createdContract, setCreatedContract] = useState<ReceptionContractResult | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const handleItemImagesChange = (itemId: string, newImages: string[]) => {
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
    setQuickName('');
    setQuickPrice('');
    setExcelFeedback(null);
    setDraftSaveSuccess(false);
    const initialCommission = 20;
    setCommissionShop(initialCommission);
    setCommissionInput(String(initialCommission));
    setTermDays(60);
    setTermDaysInput('60');

    const loadAndInit = async () => {
      try {
        const [fetchedCats, fetchedBrands] = await Promise.all([
          consignmentApi.getCategories(),
          consignmentApi.getBrands(),
        ]);
        if (!cancelled && fetchedCats.length > 0) {
          setCategories(fetchedCats);
          setQuickCategory((prev) =>
            fetchedCats.some((c) => c.name === prev) ? prev : fetchedCats[0].name,
          );
        }
        if (!cancelled && fetchedBrands.length > 0) {
          setBrands(fetchedBrands);
          setQuickBrandId((prev) =>
            fetchedBrands.some((b) => b.id === prev) ? prev : fetchedBrands[0].id,
          );
        }
      } catch {
      }

      if (cancelled) return;
      setItems([]);

      if (initialAppointment) {
        setCustomerName(initialAppointment.customerName || 'Khách hàng');
        setCustomerPhone(initialAppointment.customerPhone || '0901234567');
        setCustomerEmail('');
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
  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelLoading(true);
    setExcelFeedback(null);
    setShowWarningList(false);
    try {
      const result = await parseReceptionExcel(file, categories, brands, commissionShop);
      setItems((prev) => [...prev, ...result.items]);
      let msg = `Đã nhập thành công ${result.successCount}/${result.totalRows} sản phẩm từ tệp ${file.name}.`;
      if (result.warnings.length > 0) {
        msg += ` (${result.warnings.length} cảnh báo & sản phẩm bị bỏ qua)`;
      }
      setExcelFeedback({
        type: result.warnings.length > 0 ? 'warning' : 'success',
        message: msg,
        warnings: result.warnings,
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Lỗi khi đọc tệp Excel. Vui lòng kiểm tra định dạng tệp.';
      setExcelFeedback({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setExcelLoading(false);
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
    }
  };
  const handleRestoreDraft = () => {
    if (!draftBanner) return;
    const d = draftBanner.data;
    setActiveDraftId(d.draftId);
    if (d.customerName) setCustomerName(d.customerName);
    if (d.customerPhone) setCustomerPhone(d.customerPhone);
    if (d.customerEmail) setCustomerEmail(d.customerEmail);
    if (d.intakeType) {
      setIntakeType(d.intakeType.toLowerCase() === 'buyout' ? 'buyout' : 'consignment');
    }
    if (d.termDays) {
      setTermDays(d.termDays);
      setTermDaysInput(String(d.termDays));
    }
    if (d.commissionShop !== undefined) {
      setCommissionShop(d.commissionShop);
      setCommissionInput(String(d.commissionShop));
    }
    if (d.note) setBatchNote(d.note);
    if (Array.isArray(d.items) && d.items.length > 0) {
      const restoredItems: ConsignmentItemRow[] = d.items.map((it: any) => {
        const matchedBrand = brands.find((b) => b.id === it.brandId) || brands[0] || DEFAULT_BRANDS[0];
        const itemRate =
          it.commissionRate ??
          (matchedBrand.defaultCommissionRate > 0
            ? matchedBrand.defaultCommissionRate
            : getTierDefaultCommissionRate(matchedBrand.tier));
        return {
          id: it.id || crypto.randomUUID(),
          name: it.name,
          size: it.size || 'Size M',
          category: categories.find((c) => c.id === it.categoryId)?.name || 'Đầm & Váy',
          categoryId: it.categoryId || categories[0]?.id || DEFAULT_CATEGORIES[0].id,
          brandId: matchedBrand.id,
          brand: matchedBrand.name,
          brandTier: matchedBrand.tier,
          commissionRate: itemRate,
          condition: it.conditionPercentage ? `${it.conditionPercentage}%` : '95% Like New',
          conditionPercent: it.conditionPercentage || 95,
          listedPrice: it.listedPrice || 0,
          customerPayout: Math.round(((it.listedPrice || 0) * (100 - itemRate)) / 100),
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
            categoryId: i.categoryId || categories[0]?.id || DEFAULT_CATEGORIES[0].id,
            brandId: i.brandId || brands[0]?.id || DEFAULT_BRANDS[0].id,
            size: i.size,
            material: i.material?.trim() || 'Cotton',
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
  const handleQuickAdd = () => {
    if (!quickName.trim()) {
      setApiError('Vui lòng nhập tên sản phẩm.');
      return;
    }
    const price = Number(quickPrice);
    if (!quickPrice || Number.isNaN(price) || price <= 0) {
      setApiError('Vui lòng nhập giá niêm yết hợp lệ (> 0).');
      return;
    }
    setApiError(null);
    const matchedCat =
      categories.find((c) => c.name === quickCategory) || categories[0] || DEFAULT_CATEGORIES[0];
    const selectedBrand =
      brands.find((b) => b.id === quickBrandId) || brands[0] || DEFAULT_BRANDS[0];
    const itemCommissionRate =
      selectedBrand.defaultCommissionRate && selectedBrand.defaultCommissionRate > 0
        ? selectedBrand.defaultCommissionRate
        : getTierDefaultCommissionRate(selectedBrand.tier);
    const customerPayout = Math.round((price * (100 - itemCommissionRate)) / 100);

    const newItem: ConsignmentItemRow = {
      id: crypto.randomUUID(),
      name: quickName.trim(),
      size: quickSize,
      material: quickMaterial,
      category: matchedCat.name,
      categoryId: matchedCat.id,
      brandId: selectedBrand.id,
      brand: selectedBrand.name,
      brandTier: selectedBrand.tier,
      commissionRate: itemCommissionRate,
      condition: quickCondition,
      conditionPercent: quickConditionPercent,
      listedPrice: price,
      customerPayout,
    };

    setItems((prev) => [...prev, newItem]);
    setQuickName('');
    setQuickPrice('');
  };

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

  const handleOpenPreview = () => {
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

    setApiError(null);
    setPreviewOpen(true);
  };

  const handleSubmitReception = async () => {
    const cleanName = customerName.trim() || initialAppointment?.customerName || 'Khách hàng';
    const cleanPhone = customerPhone.trim() || initialAppointment?.customerPhone || '0901234567';

    if (!cleanName || !cleanPhone) {
      setApiError('Vui lòng nhập đầy đủ họ tên và số điện thoại chủ ký gửi.');
      return;
    }

    if (items.length === 0) {
      setApiError('Vui lòng thêm ít nhất 1 sản phẩm vào đợt ký gửi.');
      return;
    }

    setSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        appointmentId: initialAppointment?.id,
        intakeType: intakeType === 'buyout' ? ('Buyout' as const) : ('Consignment' as const),
        customerInfo: {
          fullName: cleanName,
          phoneNumber: cleanPhone,
          email: customerEmail.trim() || undefined,
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
            categoryId: i.categoryId || categories[0]?.id || DEFAULT_CATEGORIES[0].id,
            brandId: i.brandId || brands[0]?.id || DEFAULT_BRANDS[0].id,
            size: i.size,
            material: i.material?.trim() || 'Cotton',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
      
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-surface-default shadow-2xl border border-border/70 overflow-hidden text-text-primary font-sans">
        
        <div className="flex items-center justify-between px-8 py-5 border-b border-border/70 bg-surface-default shrink-0">
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

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-dashboard transition"
          >
            <X size={20} />
          </button>
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

          
          <div className="rounded-3xl border border-border/80 bg-surface-dashboard p-5 space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-text-primary">
                <UserCheck size={16} className="text-brand-highlight" />
                Thông tin chủ ký gửi & Hợp đồng đợt
              </div>

              <button
                type="button"
                onClick={() => {
                  const newName = prompt('Nhập tên chủ ký gửi mới:', customerName);
                  if (newName) setCustomerName(newName);
                  const newPhone = prompt('Nhập số điện thoại:', customerPhone);
                  if (newPhone) setCustomerPhone(newPhone);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/80 bg-brand-blue-gradient/20 px-3.5 py-1 text-xs font-bold text-blue-700 hover:bg-brand-blue-gradient/30 transition shadow-xs"
              >
                <RefreshCw size={12} /> Đổi / Tìm chủ hàng
              </button>
            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              
              <div className="md:col-span-4 flex items-start gap-3.5 pt-0.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-pink-light font-extrabold text-brand-highlight text-sm shadow-xs">
                  {customerName.trim()
                    ? customerName.trim().slice(0, 2).toUpperCase()
                    : 'KH'}
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Họ và tên khách hàng..."
                      className="flex-1 h-8 rounded-lg border border-border bg-surface-default px-2.5 text-xs font-bold text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus"
                    />
                    {customerHistoryCount > 0 && (
                      <span className="shrink-0 text-[11px] font-semibold text-text-muted">
                        {customerHistoryCount} món cũ
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        const phone = e.target.value;
                        setCustomerPhone(phone);
                        if (phone.trim().length >= 9) {
                          consignmentApi
                            .getCustomerItemHistoryCount(undefined, phone.trim())
                            .then(setCustomerHistoryCount);
                        } else {
                          setCustomerHistoryCount(0);
                        }
                      }}
                      placeholder="Số điện thoại..."
                      className="w-full h-7 rounded-lg border border-border bg-surface-default px-2.5 text-[11px] text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus"
                    />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email (không bắt buộc)..."
                      className="w-full h-7 rounded-lg border border-border bg-surface-default px-2.5 text-[11px] text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-[11px]">
                    <span className="text-text-muted font-medium">SL đồ thực tế:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        value={actualItemCount}
                        onChange={(e) => setActualItemCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 h-7 rounded-lg border border-border bg-surface-default px-2 text-center text-xs font-extrabold text-brand-highlight outline-none focus:ring-2 focus:ring-brand-pink-focus"
                      />
                      <span className="text-text-secondary font-bold">món</span>
                    </div>
                  </div>
                </div>
              </div>

              
              <div className="md:col-span-4 md:border-l border-border/80 md:pl-5 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-text-muted font-medium">Thời hạn đợt:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={termDaysInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setTermDaysInput(raw);
                        if (raw === '') return;
                        const parsed = Number(raw);
                        if (!Number.isNaN(parsed) && parsed >= 1) {
                          const clamped = Math.min(60, Math.round(parsed));
                          setTermDays(clamped);
                          if (parsed > 60) setTermDaysInput('60');
                        }
                      }}
                      onBlur={() => handleTermDaysChange(Number(termDaysInput) || 1)}
                      className="w-16 h-7 rounded-lg border border-border bg-surface-default px-2 text-center text-xs font-extrabold text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus"
                    />
                    <span className="text-xs font-bold text-text-secondary">ngày (tối đa 60)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[15, 30, 45, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleTermDaysChange(d)}
                      style={termDays === d ? { color: '#FFFFFF' } : undefined}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        termDays === d
                          ? 'bg-brand-pink !text-white shadow-2xs'
                          : 'border border-border bg-surface-default text-text-secondary hover:bg-surface-active'
                      }`}
                    >
                      {d} ngày
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                  <Calendar size={12} className="text-text-muted shrink-0" />
                  <span>{dateRangeStr}</span>
                </div>
              </div>

              
              <div className="md:col-span-4 md:border-l border-border/80 md:pl-5 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1 text-text-muted font-medium">
                    <Percent size={12} className="text-text-muted shrink-0" />
                    <span>Hoa hồng shop:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={commissionInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setCommissionInput(raw);
                        if (raw === '') return;
                        const parsed = Number(raw);
                        if (!Number.isNaN(parsed)) {
                          handleCommissionChange(parsed, parsed > 100 || parsed < 0);
                        }
                      }}
                      onBlur={() =>
                        handleCommissionChange(
                          commissionInput === '' ? 20 : Number(commissionInput),
                        )
                      }
                      className="w-16 h-7 rounded-lg border border-border bg-surface-default px-2 text-center text-xs font-extrabold text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus"
                    />
                    <span className="text-xs font-bold text-text-secondary">%</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[15, 20, 25].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleCommissionChange(rate)}
                      style={commissionShop === rate ? { color: '#FFFFFF' } : undefined}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        commissionShop === rate
                          ? 'bg-brand-pink !text-white shadow-2xs'
                          : 'border border-border bg-surface-default text-text-secondary hover:bg-surface-active'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-text-muted">
                  Shop: <strong className="text-text-primary">{commissionShop}%</strong> • Khách:{' '}
                  <strong className="text-brand-highlight">{commissionCustomer}%</strong>
                </p>
              </div>
            </div>

            
            <div className="pt-2 border-t border-border/60 flex items-center gap-2.5 text-xs text-text-muted">
              <FileText size={14} className="text-text-muted shrink-0" />
              <span className="font-semibold text-text-secondary shrink-0">Ghi chú đợt:</span>
              <input
                type="text"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                placeholder="Nhập ghi chú chi tiết về đợt ký gửi..."
                className="flex-1 bg-transparent border-b border-dashed border-border px-1.5 py-1 text-text-primary outline-none focus:border-brand-pink-focus"
              />
            </div>
          </div>

          
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
                  Dự kiến khách nhận ({commissionCustomer}%)
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
                  Dự kiến shop thu ({commissionShop}%)
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

          
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-text-primary">
                <PlusCircle size={16} className="text-blue-600" />
                Thêm nhanh sản phẩm mới vào đợt
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleExcelFileChange}
                />
                <button
                  type="button"
                  disabled={excelLoading}
                  onClick={() => excelInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-default px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-dashboard transition shadow-2xs disabled:opacity-50"
                  title="Nhập danh sách sản phẩm từ tệp Excel / CSV"
                >
                  {excelLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-brand-highlight" /> Đang đọc tệp...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet size={13} className="text-emerald-600" /> Nhập từ Excel
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={downloadReceptionTemplate}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-default px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-dashboard transition shadow-2xs"
                  title="Tải bảng tính mẫu định dạng chuẩn OCS"
                >
                  <Download size={13} className="text-blue-600" /> Tải file mẫu
                </button>
              </div>
            </div>

            
            {excelFeedback && (
              <div
                className={`rounded-2xl p-3.5 text-xs font-medium border animate-in fade-in space-y-2 ${
                  excelFeedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : excelFeedback.type === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {excelFeedback.type === 'success' ? (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={15} className="text-amber-600 shrink-0" />
                    )}
                    <span>{excelFeedback.message}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {excelFeedback.warnings && excelFeedback.warnings.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowWarningList((prev) => !prev)}
                        className="rounded-lg bg-amber-200/70 hover:bg-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 transition"
                      >
                        {showWarningList ? 'Ẩn chi tiết' : `Xem chi tiết (${excelFeedback.warnings.length})`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setExcelFeedback(null);
                        setShowWarningList(false);
                      }}
                      className="text-xs font-bold opacity-70 hover:opacity-100 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {showWarningList && excelFeedback.warnings && excelFeedback.warnings.length > 0 && (
                  <div className="mt-2 rounded-xl border border-amber-200/80 bg-white/80 p-3 max-h-40 overflow-y-auto space-y-1 text-[11px] text-amber-950 font-normal">
                    <p className="font-bold text-amber-900 mb-1">Danh sách cảnh báo & lý do bỏ qua:</p>
                    {excelFeedback.warnings.map((warn, wIdx) => (
                      <div key={wIdx} className="flex items-start gap-1.5 py-0.5 border-b border-amber-100 last:border-0">
                        <span className="text-amber-600 font-bold shrink-0">•</span>
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            
            <div className="rounded-3xl border border-border/80 bg-surface-dashboard/40 p-4 space-y-3">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Tên sản phẩm & đặc điểm (vd: Váy Dạ Tweed S)"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                  className="w-full md:flex-1 h-11 rounded-2xl border border-border bg-surface-default px-4 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus transition"
                />

                <select
                  value={quickBrandId}
                  onChange={(e) => setQuickBrandId(e.target.value)}
                  className="w-full md:w-56 h-11 rounded-2xl border border-border bg-surface-default px-3.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus transition"
                  title="Chọn thương hiệu"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  className="w-full md:w-48 h-11 rounded-2xl border border-border bg-surface-default px-3.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus transition"
                  title="Phân loại"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
                <select
                  value={quickSize}
                  onChange={(e) => setQuickSize(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-border bg-surface-default px-3.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus transition"
                  title="Kích cỡ (Size)"
                >
                  {COMMON_SIZES.map((s) => (
                    <option key={s} value={s}>
                      Size: {s}
                    </option>
                  ))}
                </select>

                <select
                  value={quickMaterial}
                  onChange={(e) => setQuickMaterial(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-border bg-surface-default px-3.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus transition"
                  title="Chất liệu"
                >
                  {COMMON_MATERIALS.map((m) => (
                    <option key={m} value={m}>
                      Vải: {m}
                    </option>
                  ))}
                </select>

                <select
                  value={quickCondition}
                  onChange={(e) => {
                    setQuickCondition(e.target.value);
                    const p = parseInt(e.target.value) || 95;
                    setQuickConditionPercent(p);
                  }}
                  className="w-full h-11 rounded-2xl border border-border bg-surface-default px-3.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus transition"
                  title="Độ mới"
                >
                  <option value="99% New Tag">99% New Tag</option>
                  <option value="95% Like New">95% Like New</option>
                  <option value="90% Tốt">90% Tốt</option>
                  <option value="85% Khá">85% Khá</option>
                  <option value="80% Đạt">80% Đạt</option>
                </select>

                <input
                  type="number"
                  step={10000}
                  min={0}
                  placeholder="Giá niêm yết (đ)"
                  value={quickPrice}
                  onChange={(e) => setQuickPrice(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                  className="w-full h-11 rounded-2xl border border-border bg-surface-default px-3.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand-pink-focus transition"
                />

                <button
                  type="button"
                  onClick={handleQuickAdd}
                  style={{ color: '#FFFFFF' }}
                  className="w-full h-11 px-5 rounded-2xl bg-brand-pink hover:bg-brand-pink-hover !text-white font-extrabold text-xs transition active:scale-95 shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap col-span-2 sm:col-span-1"
                >
                  <PlusCircle size={15} /> Thêm vào đợt
                </button>
              </div>
            </div>
          </div>

          
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-extrabold text-text-primary">
                Danh Sách Sản Phẩm Trong Đợt Ký Gửi
              </span>
              <span className="rounded-full bg-brand-pink-light px-2.5 py-0.5 text-xs font-bold text-brand-highlight border border-brand-pink-light">
                {initialAppointment
                  ? `${items.length} / ${initialAppointment.estimatedItemCount} món dự kiến`
                  : `${items.length} sản phẩm`}
              </span>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-border/80 bg-surface-default shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-surface-dashboard/70">
                    <th className="py-3.5 pl-4 w-10">#</th>
                    <th className="py-3.5 px-4">SẢN PHẨM & MÃ GUID</th>
                    <th className="py-3.5 px-4">THƯƠNG HIỆU</th>
                    <th className="py-3.5 px-4">PHÂN LOẠI</th>
                    <th className="py-3.5 px-4">ĐỘ MỚI</th>
                    <th className="py-3.5 px-4 text-right">GIÁ NIÊM YẾT</th>
                    <th className="py-3.5 px-4 text-right">TIỀN KHÁCH NHẬN</th>
                    <th className="py-3.5 pr-4 text-center w-28">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-xs text-text-muted"
                      >
                        {initialAppointment
                          ? `Lịch hẹn dự kiến tiếp nhận ${initialAppointment.estimatedItemCount} món. Vui lòng đếm đồ thực tế và thêm từng sản phẩm ở mục trên.`
                          : 'Chưa có sản phẩm nào trong đợt. Hãy nhập thông tin sản phẩm ở trên để thêm vào đợt.'}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-surface-active transition">
                      <td className="py-4 pl-4 font-bold text-text-muted">
                        {idx + 1}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.images && item.images.length > 0 && (
                            <img
                              src={item.images[0]}
                              alt={item.name}
                              onClick={() => setPhotoModalItem(item)}
                              className="h-9 w-9 rounded-xl object-cover border border-border shrink-0 cursor-pointer hover:opacity-85 shadow-2xs"
                              title="Xem/thêm ảnh"
                            />
                          )}
                          <div>
                            <div className="font-extrabold text-text-primary text-xs line-clamp-1">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-text-muted mt-0.5">
                              Size: <strong className="text-text-primary font-bold">{item.size}</strong> • Vải: <strong className="text-text-primary font-bold">{item.material || 'Cotton'}</strong>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-text-primary text-xs">
                          {item.brand || 'Khác'}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-bold border ${
                            item.category.includes('Đầm')
                              ? 'bg-brand-pink-light text-brand-highlight border-brand-pink-light'
                              : item.category.includes('Áo')
                                ? 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]'
                                : 'bg-state-info-soft text-state-info border-blue-200'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-text-secondary font-semibold">
                        {item.condition}
                      </td>

                      <td className="py-4 px-4 font-extrabold text-text-primary text-right">
                        {formatVND(item.listedPrice)}
                      </td>

                      <td className="py-4 px-4 font-extrabold text-text-primary text-right">
                        {formatVND(item.customerPayout)}
                      </td>

                      <td className="py-4 pr-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-text-muted">
                          <button
                            type="button"
                            onClick={() => setPhotoModalItem(item)}
                            className={`flex items-center gap-1 transition p-1.5 rounded-xl border ${
                              item.images && item.images.length > 0
                                ? 'bg-brand-pink-light border-brand-pink text-brand-highlight hover:bg-brand-pink/20 font-bold'
                                : 'hover:text-text-primary hover:bg-surface-dashboard border-transparent text-text-muted'
                            }`}
                            title="Chụp / tải ảnh sản phẩm (Cloudflare R2)"
                          >
                            <Camera size={15} />
                            {item.images && item.images.length > 0 && (
                              <span className="text-[10px] font-extrabold">{item.images.length}</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newPrice = prompt(
                                'Sửa giá niêm yết (đ):',
                                String(item.listedPrice),
                              );
                              if (newPrice && !isNaN(Number(newPrice))) {
                                const price = Number(newPrice);
                                const itemRate = item.commissionRate ?? 15;
                                setItems((prev) =>
                                  prev.map((i) =>
                                    i.id === item.id
                                      ? {
                                          ...i,
                                          listedPrice: price,
                                          customerPayout: Math.round(
                                            (price * (100 - itemRate)) / 100,
                                          ),
                                        }
                                      : i,
                                  ),
                                );
                              }
                            }}
                            className="hover:text-state-info transition p-1 hover:bg-surface-dashboard rounded-lg"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="hover:text-state-danger transition p-1 hover:bg-state-danger-soft rounded-lg"
                            title="Xóa món"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-8 py-5 border-t border-border/70 bg-surface-default shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-text-muted hover:text-text-primary transition px-2 py-1"
            >
              Hủy Bỏ
            </button>
            {apiError && (
              <span className="text-xs font-semibold text-state-danger bg-state-danger-soft px-3 py-1 rounded-xl border border-state-danger-border max-w-md truncate" title={apiError}>
                {apiError}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
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
              onClick={handleOpenPreview}
              className="flex items-center gap-2 rounded-2xl border border-brand-pink/50 bg-brand-pink-light/70 hover:bg-brand-pink-light text-brand-highlight px-5 py-3 text-xs font-extrabold shadow-xs transition active:scale-95"
            >
              <FileText size={15} />
              Xem Lại Phiếu ({items.length} món)
            </button>

            <button
              type="button"
              onClick={handleSubmitReception}
              disabled={submitting}
              style={{ color: '#FFFFFF' }}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-pink to-brand-pink-hover hover:opacity-95 px-6 py-3 text-xs font-extrabold !text-white shadow-md transition active:scale-95 disabled:opacity-50"
            >
              {submitting
                ? 'Đang lưu phiếu tiếp nhận...'
                : `Lưu Phiếu Tiếp Nhận (${items.length} món)`}
              <ArrowRight size={15} className="text-white" />
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
                onClick={() => setPreviewOpen(false)}
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
                    <div>
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
                    <div>
                      <span className="text-text-muted">Tỷ lệ shop thu:</span>{' '}
                      <strong className="text-text-primary font-bold">{commissionShop}%</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Tỷ lệ khách nhận:</span>{' '}
                      <strong className="text-brand-highlight font-extrabold">{commissionCustomer}%</strong>
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
                        <th className="py-2.5 px-3 text-right">GIÁ NIÊM YẾT</th>
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
                            {it.size} • {it.material || 'Cotton'}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">{it.condition}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-text-primary">
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
                onClick={() => setPreviewOpen(false)}
                className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface-default hover:bg-surface-dashboard px-4 py-2.5 text-xs font-bold text-text-secondary transition"
              >
                <RotateCcw size={14} /> Quay lại chỉnh sửa
              </button>

              <button
                type="button"
                onClick={handleSubmitReception}
                disabled={submitting}
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
