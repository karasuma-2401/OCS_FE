import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Upload,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Printer,
  Sparkles,
  ShoppingBag,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import type {
  Appointment,
  ProductInspectionItem,
  ProductInspectionImage,
  ExpiryHandlingType,
  ReceptionContractResult,
} from '@/types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_BRANDS,
  COMMON_MATERIALS,
  COMMON_SIZES,
  REJECTION_REASONS,
  consignmentApi,
} from '@/api/consignmentApi';
import { Modal } from '@/components/shared';

interface ReceptionInspectionViewProps {
  initialAppointment?: Appointment | null;
  onBack: () => void;
  onSuccess: (contract: ReceptionContractResult) => void;
}

export const ReceptionInspectionView: React.FC<ReceptionInspectionViewProps> = ({
  initialAppointment,
  onBack,
  onSuccess,
}) => {
  const isFromAppointment = Boolean(initialAppointment);
  const [customerName, setCustomerName] = useState(
    initialAppointment?.customerName || '',
  );
  const [customerPhone, setCustomerPhone] = useState(
    initialAppointment?.customerPhone || '',
  );
  const [customerEmail, setCustomerEmail] = useState('');
  const [actualItemCount, setActualItemCount] = useState<number>(
    initialAppointment?.estimatedItemCount || 3,
  );
  const [expiryHandling, setExpiryHandling] =
    useState<ExpiryHandlingType>('Return');
  const [receptionNote, setReceptionNote] = useState(
    initialAppointment?.note || '',
  );
  const createEmptyItem = (index: number): ProductInspectionItem => {
    const defaultBrand = DEFAULT_BRANDS[0];
    const defaultCategory = DEFAULT_CATEGORIES[0];
    return {
      id: crypto.randomUUID(),
      name: `Món đồ #${index + 1}`,
      categoryId: defaultCategory.id,
      categoryName: defaultCategory.name,
      brandId: defaultBrand.id,
      brandName: defaultBrand.name,
      brandTier: defaultBrand.tier,
      size: 'M',
      material: 'Cotton',
      conditionPercentage: 85,
      hasLabel: true,
      defectNotes: '',
      approvalStatus: 'Approved',
      rejectionReason: REJECTION_REASONS[0],
      listedPrice: 200000,
      commissionRate: defaultBrand.defaultCommissionRate,
      shopCommissionAmount: (200000 * defaultBrand.defaultCommissionRate) / 100,
      customerPayoutAmount: 200000 - (200000 * defaultBrand.defaultCommissionRate) / 100,
      images: [],
    };
  };

  const [items, setItems] = useState<ProductInspectionItem[]>(() => {
    const initialCount = Math.max(1, initialAppointment?.estimatedItemCount || 3);
    return Array.from({ length: initialCount }, (_, idx) => createEmptyItem(idx));
  });

  const [activeItemId, setActiveItemId] = useState<string>(() => items[0]?.id || '');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<ReceptionContractResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const summary = useMemo(() => {
    const totalCount = items.length;
    const approvedList = items.filter((i) => i.approvalStatus === 'Approved');
    const rejectedList = items.filter((i) => i.approvalStatus === 'Rejected');

    const totalListed = approvedList.reduce((sum, i) => sum + (Number(i.listedPrice) || 0), 0);
    const totalShopCommission = approvedList.reduce((sum, i) => sum + (Number(i.shopCommissionAmount) || 0), 0);
    const totalCustomerPayout = approvedList.reduce((sum, i) => sum + (Number(i.customerPayoutAmount) || 0), 0);

    return {
      totalCount,
      approvedCount: approvedList.length,
      rejectedCount: rejectedList.length,
      totalListed,
      totalShopCommission,
      totalCustomerPayout,
      approvedList,
      rejectedList,
    };
  }, [items]);
  const updateItem = (id: string, updates: Partial<ProductInspectionItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const next = { ...item, ...updates };
        if (updates.brandId && updates.brandId !== item.brandId) {
          const brandObj = DEFAULT_BRANDS.find((b) => b.id === updates.brandId);
          if (brandObj) {
            next.brandName = brandObj.name;
            next.brandTier = brandObj.tier;
            next.commissionRate = brandObj.defaultCommissionRate;
          }
        }
        const price = Number(next.listedPrice) || 0;
        const rate = Number(next.commissionRate) || 0;
        next.shopCommissionAmount = Math.round((price * rate) / 100);
        next.customerPayoutAmount = Math.max(0, price - next.shopCommissionAmount);

        return next;
      }),
    );
  };
  const handleAddItem = () => {
    const newItem = createEmptyItem(items.length);
    setItems((prev) => [...prev, newItem]);
    setActiveItemId(newItem.id);
  };

  const handleDuplicateItem = (itemToCopy: ProductInspectionItem) => {
    const duplicated: ProductInspectionItem = {
      ...itemToCopy,
      id: crypto.randomUUID(),
      name: `${itemToCopy.name} (Bản sao)`,
      images: [],
    };
    setItems((prev) => [...prev, duplicated]);
    setActiveItemId(duplicated.id);
  };

  const handleRemoveItem = async (id: string) => {
    if (uploadingItemId === id) return;
    if (items.length <= 1) {
      alert('Phiếu tiếp nhận phải có ít nhất 1 sản phẩm.');
      return;
    }
    const itemToRemove = items.find((i) => i.id === id);
    if (itemToRemove && itemToRemove.images.length > 0) {
      const remainingImages: typeof itemToRemove.images = [];
      const failedErrors: string[] = [];

      for (const img of itemToRemove.images) {
        if (!img.uploadedUrl) continue;
        try {
          await consignmentApi.deleteProductImage(img.uploadedUrl);
        } catch (err: unknown) {
          remainingImages.push(img);
          const axiosErr = err as { response?: { data?: { detail?: string; title?: string } } };
          const reason = axiosErr?.response?.data?.detail || axiosErr?.response?.data?.title || 'Không thể xóa ảnh của sản phẩm khỏi R2.';
          failedErrors.push(reason);
        }
      }

      if (remainingImages.length > 0) {
        if (!remainingImages.some((img) => img.isCover)) {
          remainingImages[0].isCover = true;
        }
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, images: remainingImages } : it)),
        );
        setUploadError(`Lỗi khi xóa ảnh của sản phẩm (${failedErrors.length} ảnh thất bại): ${failedErrors.join('; ')}.`);
        return;
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (activeItemId === id) {
      const remaining = items.filter((i) => i.id !== id);
      setActiveItemId(remaining[0]?.id || '');
    }
  };
  const handleUploadImage = async (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingItemId(itemId);
    setUploadError(null);

    const failedFiles: string[] = [];
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        failedFiles.push(`${file.name} (vượt quá 10MB)`);
        continue;
      }

      try {
        const res = await consignmentApi.uploadProductImage(file);
        const newImg: ProductInspectionImage = {
          id: res.id,
          previewUrl: res.url,
          isCover: false,
          name: file.name,
          sizeBytes: file.size,
          uploadedUrl: res.url,
        };

        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== itemId) return item;
            const isFirst = item.images.length === 0;
            return {
              ...item,
              images: [...item.images, { ...newImg, isCover: isFirst }],
            };
          }),
        );
        successCount++;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string; title?: string; message?: string } } };
        const reason =
          axiosErr?.response?.data?.detail ||
          axiosErr?.response?.data?.title ||
          axiosErr?.response?.data?.message ||
          'Lỗi khi tải ảnh lên máy chủ';
        failedFiles.push(`${file.name} (${reason})`);
      }
    }

    setUploadingItemId(null);
    event.target.value = '';

    if (failedFiles.length > 0) {
      setUploadError(
        `Đã tải ${successCount} ảnh thành công. Thất bại ${failedFiles.length} ảnh: ${failedFiles.join('; ')}.`,
      );
    }
  };

  const handleRemoveImage = async (itemId: string, imgId: string) => {
    const item = items.find((i) => i.id === itemId);
    const imgToDelete = item?.images.find((img) => img.id === imgId);
    if (imgToDelete?.uploadedUrl) {
      try {
        await consignmentApi.deleteProductImage(imgToDelete.uploadedUrl);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string; title?: string } } };
        const reason = axiosErr?.response?.data?.detail || axiosErr?.response?.data?.title || 'Không thể xóa ảnh khỏi máy chủ lưu trữ R2.';
        setUploadError(`Lỗi khi xóa ảnh: ${reason}`);
        return;
      }
    }
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const remaining = it.images.filter((img) => img.id !== imgId);
        if (remaining.length > 0 && !remaining.some((img) => img.isCover)) {
          remaining[0].isCover = true;
        }
        return { ...it, images: remaining };
      }),
    );
  };

  const handleSetCoverImage = (itemId: string, imgId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          images: item.images.map((img) => ({
            ...img,
            isCover: img.id === imgId,
          })),
        };
      }),
    );
  };
  const handleSubmitContract = async () => {
    setValidationError(null);

    if (uploadingItemId) {
      setValidationError('Vui lòng đợi tải ảnh hoàn tất trước khi lập phiếu.');
      return;
    }

    if (!customerName.trim()) {
      setValidationError('Vui lòng nhập họ và tên khách hàng.');
      return;
    }
    if (!customerPhone.trim()) {
      setValidationError('Vui lòng nhập số điện thoại khách hàng.');
      return;
    }
    if (items.length === 0) {
      setValidationError('Phiếu tiếp nhận phải có ít nhất 1 sản phẩm.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        appointmentId: initialAppointment?.id,
        customerInfo: {
          fullName: customerName.trim(),
          phoneNumber: customerPhone.trim(),
          email: customerEmail.trim() || undefined,
        },
        actualItemCount,
        expiryHandling,
        note: receptionNote.trim() || undefined,
        items: items.map((item) => {
          const coverImg = item.images.find((img) => img.isCover);
          const detailImgs = item.images.filter((img) => !img.isCover);
          const orderedImages = coverImg ? [coverImg, ...detailImgs] : item.images;
          const coverUrl = coverImg ? (coverImg.uploadedUrl || coverImg.previewUrl) : undefined;
          const imageUrls = orderedImages.map((img) => img.uploadedUrl || img.previewUrl);

          return {
            name: item.name.trim(),
            categoryId: item.categoryId,
            brandId: item.brandId,
            size: item.size,
            material: item.material,
            conditionPercentage: item.conditionPercentage,
            hasLabel: item.hasLabel,
            defectNotes: item.defectNotes?.trim() || undefined,
            approvalStatus: item.approvalStatus === 'Approved' ? ('Approved' as const) : ('Rejected' as const),
            rejectionReason: item.approvalStatus === 'Rejected' ? item.rejectionReason : undefined,
            listedPrice: item.approvalStatus === 'Approved' ? Number(item.listedPrice) : 0,
            commissionRate: item.approvalStatus === 'Approved' ? Number(item.commissionRate) : 0,
            coverImageUrl: coverUrl,
            imageUrls,
          };
        }),
      };

      const result = await consignmentApi.createReception(payload);
      setCreatedResult(result);
      setPreviewModalOpen(false);
      onSuccess(result);
    } catch {
      setValidationError('Không thể lưu hợp đồng. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className="w-full space-y-5 pb-16">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2 text-xs font-bold text-gray-800 shadow-sm transition hover:bg-white hover:border-gray-200 active:scale-95"
          >
            <ArrowLeft size={16} /> Quay lại lịch hẹn
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Tiếp Nhận & Kiểm Định Sản Phẩm
              <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-bold text-[#E53E8A]">
                UC-02
              </span>
            </h1>
            <p className="text-xs text-gray-500">
              {isFromAppointment
                ? `Tiếp nhận theo lịch hẹn: ${initialAppointment?.trackingNumber} (${initialAppointment?.customerName})`
                : 'Tiếp nhận khách vãng lai trực tiếp tại quầy'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 flex items-center gap-1.5"
          >
            <FileText size={15} /> Xem trước biên bản
          </button>
          <button
            type="button"
            onClick={handleSubmitContract}
            disabled={submitting || uploadingItemId !== null}
            className="rounded-2xl bg-button-pastel px-5 py-2.5 text-xs font-bold text-brand-ink shadow-sm transition enabled:hover:bg-button-pastel-hover enabled:active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Sparkles size={15} /> Lập hợp đồng & Cấp Barcode
          </button>
        </div>
      </div>

      {validationError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <span>{validationError}</span>
        </div>
      )}

      
      <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-sm p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
          <ShoppingBag size={16} className="text-[#E53E8A]" />
          Thông tin khách hàng & Phiếu tiếp nhận
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Họ và tên khách hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="VD: 0901234567"
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Email (nhận hợp đồng điện tử)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="khachhang@example.com"
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Số lượng đồ thực tế mang đến
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={actualItemCount}
              onChange={(e) => setActualItemCount(Number(e.target.value))}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Phương án xử lý khi hết hạn hợp đồng (60 ngày)
            </label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                <input
                  type="radio"
                  name="expiryHandling"
                  value="Return"
                  checked={expiryHandling === 'Return'}
                  onChange={() => setExpiryHandling('Return')}
                  className="accent-[#E53E8A]"
                />
                Nhận lại đồ (Cửa hàng liên hệ hoàn trả)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                <input
                  type="radio"
                  name="expiryHandling"
                  value="Donate"
                  checked={expiryHandling === 'Donate'}
                  onChange={() => setExpiryHandling('Donate')}
                  className="accent-[#E53E8A]"
                />
                Quyên góp từ thiện (Ủng hộ quỹ bảo trợ)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Ghi chú tiếp nhận
            </label>
            <input
              type="text"
              value={receptionNote}
              onChange={(e) => setReceptionNote(e.target.value)}
              placeholder="Ghi chú thêm về yêu cầu của khách hoặc phụ kiện kèm theo..."
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 text-sm">
              Danh sách món đồ ({items.length})
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#E53E8A] hover:text-pink-700 transition"
            >
              <Plus size={14} /> Thêm món mới
            </button>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {items.map((item, index) => {
              const isSelected = item.id === activeItemId;
              const isApproved = item.approvalStatus === 'Approved';

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveItemId(item.id)}
                  className={`cursor-pointer rounded-2xl border p-3.5 transition-all shadow-sm ${
                    isSelected
                      ? 'border-[#FA9BBF] bg-[#FFF5F8] ring-2 ring-pink-200'
                      : 'border-white/80 bg-white/95 hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Món #{index + 1}
                      </span>
                      <h4 className="text-xs font-extrabold text-gray-900 line-clamp-1">
                        {item.name || `Món đồ #${index + 1}`}
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {item.brandName} • Size {item.size} • Độ mới {item.conditionPercentage}%
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {isApproved ? (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                          Nhận ({formatVND(item.listedPrice)})
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                          Từ chối
                        </span>
                      )}
                    </div>
                  </div>

                  {item.images.length > 0 && (
                    <div className="mt-2 flex gap-1.5 overflow-x-auto">
                      {item.images.map((img) => (
                        <img
                          key={img.id}
                          src={img.previewUrl}
                          alt="thumbnail"
                          className="h-10 w-10 rounded-lg object-cover border border-gray-200 shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        
        <div className="lg:col-span-8">
          {items.map((item, index) => {
            if (item.id !== activeItemId) return null;

            const isApproved = item.approvalStatus === 'Approved';

            return (
              <div
                key={item.id}
                className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-sm p-6 shadow-sm space-y-5"
              >
                
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#E53E8A] uppercase tracking-wider">
                      Đang kiểm định Món #{index + 1} / {items.length}
                    </span>
                    <h3 className="text-base font-extrabold text-gray-900">
                      {item.name || `Món đồ #${index + 1}`}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicateItem(item)}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                      title="Nhân bản thông tin sang món mới"
                    >
                      <Copy size={13} /> Nhân bản
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={uploadingItemId === item.id}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                      title="Xóa món đồ này"
                    >
                      <Trash2 size={13} /> Xóa món
                    </button>
                  </div>
                </div>

                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      placeholder="VD: Áo dạ tweed trắng viền đen"
                      className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Danh mục đồ
                    </label>
                    <select
                      value={item.categoryId}
                      onChange={(e) => {
                        const cat = DEFAULT_CATEGORIES.find((c) => c.id === e.target.value);
                        updateItem(item.id, {
                          categoryId: e.target.value,
                          categoryName: cat?.name || '',
                        });
                      }}
                      className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
                    >
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Thương hiệu
                    </label>
                    <select
                      value={item.brandId}
                      onChange={(e) => updateItem(item.id, { brandId: e.target.value })}
                      className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
                    >
                      {DEFAULT_BRANDS.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Size
                    </label>
                    <select
                      value={item.size}
                      onChange={(e) => updateItem(item.id, { size: e.target.value })}
                      className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
                    >
                      {COMMON_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Chất liệu chính
                    </label>
                    <select
                      value={item.material}
                      onChange={(e) => updateItem(item.id, { material: e.target.value })}
                      className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
                    >
                      {COMMON_MATERIALS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                
                <div className="rounded-2xl border border-gray-100 bg-[#FAFAFC] p-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center justify-between">
                    <span>Đánh giá kiểm định chất lượng:</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        item.conditionPercentage >= 80
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.conditionPercentage >= 80
                        ? `✓ Đạt chuẩn tiếp nhận (${item.conditionPercentage}%)`
                        : `⚠ Dưới 80% (${item.conditionPercentage}%) - Chú ý`}
                    </span>
                  </h4>

                  
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Độ mới sản phẩm:</span>
                      <strong className="text-sm font-extrabold text-[#E53E8A]">
                        {item.conditionPercentage}%
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      value={item.conditionPercentage}
                      onChange={(e) =>
                        updateItem(item.id, { conditionPercentage: Number(e.target.value) })
                      }
                      className="w-full accent-[#E53E8A] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>40% (Cũ)</span>
                      <span className="font-bold text-green-600">80% (Chuẩn tối thiểu)</span>
                      <span>100% (Mới tinh/New with tag)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Tình trạng tem mác
                      </label>
                      <div className="flex items-center gap-4 pt-1 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                          <input
                            type="radio"
                            name={`label-${item.id}`}
                            checked={item.hasLabel}
                            onChange={() => updateItem(item.id, { hasLabel: true })}
                            className="accent-[#E53E8A]"
                          />
                          Còn nguyên tem mác
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                          <input
                            type="radio"
                            name={`label-${item.id}`}
                            checked={!item.hasLabel}
                            onChange={() => updateItem(item.id, { hasLabel: false })}
                            className="accent-[#E53E8A]"
                          />
                          Đã cắt tem mác
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Mô tả lỗi sản phẩm (nếu có)
                      </label>
                      <input
                        type="text"
                        value={item.defectNotes || ''}
                        onChange={(e) => updateItem(item.id, { defectNotes: e.target.value })}
                        placeholder="VD: Không lỗi / Sờn nhẹ viền cổ / Mất 1 cúc phụ..."
                        className="w-full rounded-2xl border border-gray-200 px-3 py-1.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-pink-200"
                      />
                    </div>
                  </div>
                </div>

                
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-800">
                    Quyết định thẩm định:
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, { approvalStatus: 'Approved' })}
                      className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold transition shadow-sm ${
                        isApproved
                          ? 'bg-green-600 text-white ring-2 ring-green-300'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <CheckCircle2 size={16} /> Chấp nhận ký gửi (Nhận)
                    </button>

                    <button
                      type="button"
                      onClick={() => updateItem(item.id, { approvalStatus: 'Rejected' })}
                      className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold transition shadow-sm ${
                        !isApproved
                          ? 'bg-red-600 text-white ring-2 ring-red-300'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <XCircle size={16} /> Từ chối nhận
                    </button>
                  </div>

                  
                  {isApproved ? (
                    <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Giá bán niêm yết (đ) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step={10000}
                            min={0}
                            value={item.listedPrice}
                            onChange={(e) =>
                              updateItem(item.id, { listedPrice: Number(e.target.value) })
                            }
                            className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-green-300"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Hoa hồng shop (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.commissionRate}
                            onChange={(e) =>
                              updateItem(item.id, { commissionRate: Number(e.target.value) })
                            }
                            className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-green-300"
                          />
                        </div>

                        <div>
                          <span className="block text-[11px] font-bold text-gray-500 mb-1">
                            Hoa hồng shop nhận
                          </span>
                          <div className="rounded-2xl border border-transparent bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                            {formatVND(item.shopCommissionAmount)}
                          </div>
                        </div>

                        <div>
                          <span className="block text-[11px] font-bold text-green-700 mb-1">
                            Khách dự kiến nhận
                          </span>
                          <div className="rounded-2xl border border-green-200 bg-white px-3 py-2 text-sm font-extrabold text-green-700">
                            {formatVND(item.customerPayoutAmount)}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 italic">
                        * Tỷ lệ hoa hồng và giá niêm yết sẽ được snapshot cố định trong hợp đồng để không bị thay đổi về sau.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-red-800 mb-1">
                          Lý do từ chối sản phẩm <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={item.rejectionReason}
                          onChange={(e) =>
                            updateItem(item.id, { rejectionReason: e.target.value })
                          }
                          className="w-full rounded-2xl border border-red-200 bg-white px-3.5 py-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-red-200"
                        >
                          {REJECTION_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[11px] text-red-600">
                        Sản phẩm này sẽ được xuất trong biên bản hoàn trả lại khách hàng ngay tại quầy.
                      </p>
                    </div>
                  )}
                </div>

                
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Upload size={14} className="text-[#E53E8A]" />
                        Hình ảnh kiểm định sản phẩm (Cloudflare R2)
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Tối đa 5 ảnh / sản phẩm, kích thước tối đa 10MB/ảnh (JPG, PNG, WEBP).
                      </p>
                    </div>

                    <label
                      className={`inline-flex items-center gap-1.5 rounded-2xl bg-white border border-gray-200 px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition ${
                        uploadingItemId === item.id ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                      }`}
                    >
                      {uploadingItemId === item.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-pink-600" /> Đang tải...
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> Thêm ảnh
                        </>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingItemId === item.id}
                        onChange={(e) => handleUploadImage(item.id, e)}
                      />
                    </label>
                  </div>

                  {uploadError && (
                    <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in">
                      <span>{uploadError}</span>
                      <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        className="p-1 text-red-500 hover:text-red-700 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {item.images.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center text-xs text-gray-400 bg-gray-50/50">
                      Chưa có hình ảnh nào cho món đồ này. Nhấn "Thêm ảnh" để tải lên ảnh kiểm định.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {item.images.map((img) => (
                        <div
                          key={img.id}
                          className="group relative rounded-2xl border border-gray-200 overflow-hidden bg-gray-100 shadow-sm"
                        >
                          <img
                            src={img.previewUrl}
                            alt={img.name}
                            className="h-28 w-full object-cover"
                          />
                          <div className="absolute top-1.5 left-1.5">
                            {img.isCover && (
                              <span className="rounded-md bg-[#E53E8A] px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                                Ảnh bìa
                              </span>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!img.isCover && (
                              <button
                                type="button"
                                onClick={() => handleSetCoverImage(item.id, img.id)}
                                className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-gray-800 hover:bg-pink-50"
                              >
                                Đặt ảnh bìa
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(item.id, img.id)}
                              className="rounded-lg bg-red-600 p-1 text-white hover:bg-red-700"
                              title="Xóa ảnh"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      
      <div className="sticky bottom-4 z-20 rounded-3xl border border-white/90 bg-white/95 backdrop-blur-md p-4 sm:p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Tổng số món
            </span>
            <span className="text-sm font-extrabold text-gray-900">
              {summary.totalCount} món
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
              ✓ Nhận: {summary.approvedCount} món
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
              ✕ Từ chối: {summary.rejectedCount} món
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Tổng tiền niêm yết
            </span>
            <span className="text-sm font-bold text-gray-700">
              {formatVND(summary.totalListed)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider block">
              Tổng tiền khách dự kiến nhận
            </span>
            <span className="text-base font-extrabold text-[#E53E8A]">
              {formatVND(summary.totalCustomerPayout)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            Xem trước biên bản
          </button>
          <button
            type="button"
            onClick={handleSubmitContract}
            disabled={submitting || uploadingItemId !== null}
            className="rounded-2xl bg-button-pastel py-3 px-6 text-xs font-extrabold text-brand-ink shadow-sm transition enabled:hover:bg-button-pastel-hover enabled:active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles size={16} /> Lập hợp đồng & Cấp Barcode
          </button>
        </div>
      </div>

      
      {previewModalOpen && (
        <Modal
          open={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title="Biên Bản Tiếp Nhận & Kiểm Định Ký Gửi"
          description="Kiểm tra thông tin chi tiết cùng khách hàng trước khi lưu chính thức vào hệ thống"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Printer size={14} /> In biên bản
              </button>
              <button
                type="button"
                onClick={handleSubmitContract}
                disabled={submitting || uploadingItemId !== null}
                className="rounded-xl bg-button-pastel px-5 py-2 text-xs font-bold text-brand-ink hover:bg-button-pastel-hover disabled:opacity-50"
              >
                Xác nhận lưu hợp đồng
              </button>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-xs text-gray-700 max-h-[70vh] overflow-y-auto">
            
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 block text-[11px]">Bên ký gửi (Khách hàng):</span>
                <p className="font-bold text-sm text-gray-900">{customerName}</p>
                <p className="text-gray-500">SĐT: {customerPhone}</p>
                {customerEmail && <p className="text-gray-500">Email: {customerEmail}</p>}
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">Phương thức hết hạn & Kỳ hạn:</span>
                <p className="font-bold text-sm text-gray-900">
                  {expiryHandling === 'Return' ? 'Nhận lại đồ khi hết hạn' : 'Quyên góp từ thiện'}
                </p>
                <p className="text-gray-500">Thời hạn ký gửi: 60 ngày kể từ hôm nay</p>
                {receptionNote && <p className="text-gray-500 italic mt-1">Ghi chú: "{receptionNote}"</p>}
              </div>
            </div>

            
            <div>
              <h4 className="font-extrabold text-green-700 text-xs mb-2">
                1. Danh sách sản phẩm ĐẠT YÊU CẦU ({summary.approvedCount} món)
              </h4>
              {summary.approvedList.length === 0 ? (
                <p className="text-gray-400 italic py-2">Không có sản phẩm nào được nhận.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-600">
                      <tr>
                        <th className="p-2.5">STT</th>
                        <th className="p-2.5">Tên sản phẩm</th>
                        <th className="p-2.5">Size / Chất liệu</th>
                        <th className="p-2.5 text-center">Độ mới</th>
                        <th className="p-2.5 text-right">Giá niêm yết</th>
                        <th className="p-2.5 text-center">Hoa hồng</th>
                        <th className="p-2.5 text-right">Khách nhận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {summary.approvedList.map((item, i) => (
                        <tr key={item.id}>
                          <td className="p-2.5 font-bold text-gray-400">{i + 1}</td>
                          <td className="p-2.5 font-bold text-gray-900">{item.name}</td>
                          <td className="p-2.5 text-gray-600">{item.size} • {item.material}</td>
                          <td className="p-2.5 text-center">{item.conditionPercentage}%</td>
                          <td className="p-2.5 text-right font-semibold">{formatVND(item.listedPrice)}</td>
                          <td className="p-2.5 text-center">{item.commissionRate}%</td>
                          <td className="p-2.5 text-right font-extrabold text-green-700">
                            {formatVND(item.customerPayoutAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            
            {summary.rejectedList.length > 0 && (
              <div>
                <h4 className="font-extrabold text-red-600 text-xs mb-2">
                  2. Danh sách sản phẩm TỪ CHỐI ({summary.rejectedCount} món - Trả lại khách)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-red-200 bg-red-50/20">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-red-50 border-b border-red-200 text-[11px] font-bold text-red-700">
                      <tr>
                        <th className="p-2.5">STT</th>
                        <th className="p-2.5">Tên sản phẩm</th>
                        <th className="p-2.5">Size / Chất liệu</th>
                        <th className="p-2.5">Lý do từ chối</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {summary.rejectedList.map((item, i) => (
                        <tr key={item.id}>
                          <td className="p-2.5 font-bold text-red-400">{i + 1}</td>
                          <td className="p-2.5 font-bold text-gray-900">{item.name}</td>
                          <td className="p-2.5 text-gray-600">{item.size} • {item.material}</td>
                          <td className="p-2.5 text-red-600 italic">{item.rejectionReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            
            <div className="rounded-xl border border-gray-200 p-3 bg-white flex justify-between items-center">
              <span className="font-bold text-gray-700">Tổng tiền khách dự kiến nhận khi bán hết:</span>
              <span className="text-base font-extrabold text-[#E53E8A]">
                {formatVND(summary.totalCustomerPayout)}
              </span>
            </div>
          </div>
        </Modal>
      )}

      
      {createdResult && (
        <Modal
          open={Boolean(createdResult)}
          onClose={() => {
            setCreatedResult(null);
            onBack();
          }}
          title="Tạo Hợp Đồng Tiếp Nhận Thành Công!"
          description={`Mã hợp đồng: ${createdResult.contractNumber}`}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Printer size={14} /> In nhãn Barcode & Biên bản
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedResult(null);
                  onBack();
                }}
                className="rounded-xl bg-button-pastel px-5 py-2 text-xs font-bold text-brand-ink hover:bg-button-pastel-hover"
              >
                Về danh sách lịch hẹn
              </button>
            </div>
          }
        >
          <div className="space-y-4 py-3 text-xs text-center">
            <CheckCircle2 size={48} className="mx-auto text-green-600" />
            <h3 className="text-base font-extrabold text-gray-900">
              Hợp đồng {createdResult.contractNumber} đã được lập thành công!
            </h3>
            <p className="text-gray-500">
              Đã tạo {createdResult.totalApprovedItems} sản phẩm được nhận ký gửi kèm mã vạch Barcode độc nhất.
            </p>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left space-y-2">
              <p className="font-bold text-gray-800 text-xs">Mã Barcode đã cấp cho sản phẩm:</p>
              <div className="divide-y divide-gray-200">
                {createdResult.createdProducts.map((p) => (
                  <div key={p.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-[11px]">
                        {p.barcode}
                      </span>
                      <span className="ml-2 font-bold text-gray-800">{p.name}</span>
                    </div>
                    <span className="font-semibold text-gray-700">
                      {formatVND(p.listedPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-blue-900 text-left flex items-start gap-2">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Hệ thống đã tự động gửi thông báo xác nhận và chi tiết biên bản tiếp nhận tới khách hàng qua email và Push Notification FCM.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
