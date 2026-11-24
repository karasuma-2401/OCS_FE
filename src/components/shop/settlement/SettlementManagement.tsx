import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  GripVertical,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Combobox,
  type ComboboxOption,
  DetailPanel,
  EmptyState,
  ErrorState,
  Input,
  PageHeaderCard,
  Pagination,
  SkeletonLoading,
  Table,
  Toast,
  type BadgeVariant,
  type TableColumn,
} from '@/components/shared';
import { settlementsApi, formatVnd } from '@/api/settlements';
import type {
  SettlementContract,
  SettlementStatus,
  SettlementDocument,
  RecordTransferPayload,
} from '@/types/settlement';
import { useAuth } from '@/context/AuthContext';
import { SettlementDetailView } from './SettlementDetailView';
import { SettlementApprovalModal } from './SettlementApprovalModal';
import { SettlementTransferModal } from './SettlementTransferModal';
import { SettlementDocumentLightbox } from './SettlementDocumentLightbox';
import { SettlementPrintStatement } from './SettlementPrintStatement';

const PAGE_SIZE = 8;
const DEFAULT_LIST_WIDTH = 220;
const MIN_LIST_WIDTH = 160;
const MAX_LIST_WIDTH = 380;

const statusOptions: ComboboxOption[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ xác nhận' },
  { value: 'Approved', label: 'Đã duyệt chi' },
  { value: 'PaymentRecorded', label: 'Đã ghi nhận CK' },
  { value: 'Completed', label: 'Đã hoàn tất' },
  { value: 'Rejected', label: 'Đã từ chối' },
];

const statusBadgeConfig: Record<
  SettlementStatus,
  { label: string; variant: BadgeVariant }
> = {
  Pending: { label: 'Chờ xác nhận', variant: 'warning' },
  Approved: { label: 'Đã duyệt chi', variant: 'info' },
  PaymentRecorded: { label: 'Đã ghi nhận CK', variant: 'payment' },
  Completed: { label: 'Đã hoàn tất', variant: 'success' },
  Rejected: { label: 'Từ chối', variant: 'danger' },
};

export function SettlementManagement() {
  const { user } = useAuth();
  const [items, setItems] = useState<SettlementContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<'all' | SettlementStatus>('all');
  const [page, setPage] = useState(1);

  // Selected item for split panel
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailPanelRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resizable list width state (when detail view is open)
  const [listWidth, setListWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_LIST_WIDTH;
    try {
      const saved = localStorage.getItem('ocs_settlement_list_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_LIST_WIDTH && parsed <= MAX_LIST_WIDTH) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_LIST_WIDTH;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(listWidth);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = listWidth;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const containerWidth = containerRef.current?.getBoundingClientRect().width || 1200;
      const maxAllowed = Math.min(MAX_LIST_WIDTH, Math.max(MIN_LIST_WIDTH, containerWidth - 500));
      const newWidth = Math.min(maxAllowed, Math.max(MIN_LIST_WIDTH, dragStartWidth.current + deltaX));
      setListWidth(newWidth);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setListWidth((latest) => {
        try {
          localStorage.setItem('ocs_settlement_list_width', String(latest));
        } catch {}
        return latest;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleDoubleClick = () => {
    setListWidth(DEFAULT_LIST_WIDTH);
    try {
      localStorage.setItem('ocs_settlement_list_width', String(DEFAULT_LIST_WIDTH));
    } catch {}
  };

  const handleSplitterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setListWidth((w) => Math.max(MIN_LIST_WIDTH, w - 20));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setListWidth((w) => Math.min(MAX_LIST_WIDTH, w + 20));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setListWidth(MIN_LIST_WIDTH);
    } else if (e.key === 'End') {
      e.preventDefault();
      setListWidth(MAX_LIST_WIDTH);
    }
  };

  // Modals state
  const [approvalModal, setApprovalModal] = useState<{
    open: boolean;
    mode: 'approve' | 'reject';
    settlement: SettlementContract | null;
  }>({ open: false, mode: 'approve', settlement: null });

  const [transferModal, setTransferModal] = useState<{
    open: boolean;
    settlement: SettlementContract | null;
  }>({ open: false, settlement: null });

  const [lightboxModal, setLightboxModal] = useState<{
    open: boolean;
    document: SettlementDocument | null;
  }>({ open: false, document: null });

  const [printModal, setPrintModal] = useState<{
    open: boolean;
    settlement: SettlementContract | null;
  }>({ open: false, settlement: null });

  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load settlements
  const loadData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError('');
    try {
      const data = await settlementsApi.list();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách quyết toán.');
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Selected settlement object
  const selectedSettlement = useMemo(() => {
    if (!selectedId) return null;
    return items.find((i) => i.id === selectedId) || null;
  }, [items, selectedId]);

  // Filtered settlements
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('vi-VN');
    return items.filter((item) => {
      const matchStatus = activeStatus === 'all' || item.status === activeStatus;
      if (!matchStatus) return false;
      if (!q) return true;
      return (
        item.settlementNumber.toLocaleLowerCase('vi-VN').includes(q) ||
        item.contractNumber.toLocaleLowerCase('vi-VN').includes(q) ||
        item.customerName.toLocaleLowerCase('vi-VN').includes(q) ||
        item.customerPhone.includes(q) ||
        item.bankAccountNumber.includes(q) ||
        (item.payment.bankTransactionReference &&
          item.payment.bankTransactionReference.toLocaleLowerCase('vi-VN').includes(q))
      );
    });
  }, [items, searchQuery, activeStatus]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Metric stats
  const metrics = useMemo(() => {
    const pendingItems = items.filter((i) => i.status === 'Pending');
    const approvedItems = items.filter((i) => i.status === 'Approved');
    const recordedItems = items.filter((i) => i.status === 'PaymentRecorded');
    const completedItems = items.filter((i) => i.status === 'Completed');

    const totalPayoutNeeded = pendingItems.reduce((acc, i) => acc + i.netPayout, 0);
    const approvedPayout = approvedItems.reduce((acc, i) => acc + i.netPayout, 0);
    const completedPayout = completedItems.reduce((acc, i) => acc + i.netPayout, 0);
    const totalGrossRevenue = items.reduce((acc, i) => acc + i.totalRevenue, 0);

    return {
      pendingCount: pendingItems.length,
      pendingPayout: totalPayoutNeeded,
      approvedCount: approvedItems.length,
      approvedPayout,
      recordedCount: recordedItems.length,
      completedCount: completedItems.length,
      completedPayout,
      totalGrossRevenue,
    };
  }, [items]);

  // Actions
  const handleApprove = async (managerNote: string) => {
    if (!approvalModal.settlement) return;
    setActionLoading(true);
    try {
      const updated = await settlementsApi.approve(
        approvalModal.settlement.id,
        { managerNote },
        { id: user?.id, fullName: user?.fullName || 'Quản lý cửa hàng' }
      );
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setToastMessage(`Đã duyệt chi quyết toán ${updated.settlementNumber} thành công.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (rejectionReason: string) => {
    if (!approvalModal.settlement) return;
    setActionLoading(true);
    try {
      const updated = await settlementsApi.reject(
        approvalModal.settlement.id,
        { rejectionReason },
        { id: user?.id, fullName: user?.fullName || 'Quản lý cửa hàng' }
      );
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setToastMessage(`Đã từ chối duyệt chi quyết toán ${updated.settlementNumber}.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (payload: RecordTransferPayload) => {
    if (!transferModal.settlement) return;
    setActionLoading(true);
    try {
      const updated = await settlementsApi.recordTransfer(
        transferModal.settlement.id,
        payload,
        { id: user?.id, fullName: user?.fullName || 'Kế toán cửa hàng' }
      );
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setToastMessage(`Đã ghi nhận chuyển khoản cho quyết toán ${updated.settlementNumber}.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (settlementId: string) => {
    setActionLoading(true);
    try {
      const updated = await settlementsApi.complete(settlementId, {
        id: user?.id,
        fullName: user?.fullName || 'Quản lý cửa hàng',
      });
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setToastMessage(`Đã xác nhận hoàn tất quyết toán ${updated.settlementNumber}.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDoc = async (
    settlementId: string,
    doc: {
      fileName: string;
      fileType: 'image' | 'pdf';
      fileSize: number;
      dataUrl: string;
      documentType: 'TransferReceipt' | 'SettlementSheet' | 'Other';
    }
  ) => {
    const updated = await settlementsApi.addDocument(settlementId, {
      ...doc,
      uploadedByName: user?.fullName || 'Nhân viên cửa hàng',
    });
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setToastMessage(`Đã tải lên chứng từ ${doc.fileName} thành công.`);
  };

  const handleDeleteDoc = async (settlementId: string, docId: string) => {
    const updated = await settlementsApi.removeDocument(settlementId, docId);
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setToastMessage('Đã gỡ bỏ chứng từ.');
  };

  const handleResetData = () => {
    settlementsApi.resetStore();
    void loadData();
    setSelectedId(null);
    setToastMessage('Đã khôi phục dữ liệu quyết toán mặc định.');
  };

  // Full Table Columns Definition (when detail is closed)
  const fullColumns: TableColumn<SettlementContract>[] = [
    {
      key: 'settlementNumber',
      header: 'Mã QT',
      render: (row) => (
        <span className="font-mono font-bold text-brand-ink">{row.settlementNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (row) => (
        <span className="font-semibold text-slate-800">{row.customerName}</span>
      ),
    },
    {
      key: 'items',
      header: 'Đã bán',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (row) => (
        <span className="text-xs">
          <strong className="text-emerald-700">{row.soldItemCount}</strong> / {row.totalItemCount}
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      headerClassName: 'text-left',
      cellClassName: 'text-left',
      render: (row) => (
        <span className="font-medium text-slate-800">{formatVnd(row.totalRevenue)}</span>
      ),
    },
    {
      key: 'deductions',
      header: 'Hoa hồng & Phí',
      headerClassName: 'text-left',
      cellClassName: 'text-left',
      render: (row) => {
        const totalDeductions = row.commissionAmount + row.fees;
        return (
          <span className="font-semibold text-rose-700">
            - {formatVnd(totalDeductions)}
          </span>
        );
      },
    },
    {
      key: 'netPayout',
      header: 'Số tiền cần trả',
      headerClassName: 'text-left',
      cellClassName: 'text-left',
      render: (row) => (
        <span className="font-bold text-emerald-700 text-sm">{formatVnd(row.netPayout)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (row) => {
        const conf = statusBadgeConfig[row.status] || {
          label: row.status,
          variant: 'neutral' as BadgeVariant,
        };
        return <Badge variant={conf.variant}>{conf.label}</Badge>;
      },
    },
  ];

  // Compact Table Columns Definition (only settlement code when detail view is open)
  const compactColumns: TableColumn<SettlementContract>[] = [
    {
      key: 'settlementNumber',
      header: 'Mã QT',
      render: (row) => (
        <span className="font-mono font-bold text-brand-ink">{row.settlementNumber}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50">
          <Toast
            variant="success"
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Page Header */}
      <PageHeaderCard
        icon={<Banknote size={26} aria-hidden="true" />}
        title="Quản Lý Quyết Toán Ký Gửi"
        description="Bảng kê hợp đồng, doanh thu, hoa hồng, phí dịch vụ và quy trình duyệt chi, ghi nhận chuyển khoản cho khách hàng."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
              startIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            >
              Làm mới
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetData}
              title="Khôi phục dữ liệu mẫu ban đầu"
              startIcon={<RotateCcw size={14} />}
            >
              <span className="hidden sm:inline">Đặt lại mẫu</span>
            </Button>
          </div>
        }
      />

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1: Chờ xác nhận */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Chờ xác nhận duyệt
            </span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {metrics.pendingCount} <span className="text-xs font-normal">hợp đồng</span>
          </div>
          <p className="mt-1 text-xs text-amber-700/90 font-medium">
            Số tiền: {formatVnd(metrics.pendingPayout)}
          </p>
        </div>

        {/* Metric 2: Đã duyệt chi */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-800">
              Đã duyệt chi
            </span>
            <CreditCard size={18} className="text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-900">
            {metrics.approvedCount} <span className="text-xs font-normal">hợp đồng</span>
          </div>
          <p className="mt-1 text-xs text-sky-700/90 font-medium">
            Sẵn sàng chi: {formatVnd(metrics.approvedPayout)}
          </p>
        </div>

        {/* Metric 3: Đã hoàn tất */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Đã hoàn tất
            </span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">
            {metrics.completedCount} <span className="text-xs font-normal">hợp đồng</span>
          </div>
          <p className="mt-1 text-xs text-emerald-700/90 font-medium">
            Đã chi trả: {formatVnd(metrics.completedPayout)}
          </p>
        </div>

        {/* Metric 4: Tổng doanh thu */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-800">
              Tổng doanh thu ký gửi
            </span>
            <Receipt size={18} className="text-purple-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-purple-900 sm:text-2xl">
            {formatVnd(metrics.totalGrossRevenue)}
          </div>
          <p className="mt-1 text-xs text-purple-700/90 font-medium">
            Tổng {items.length} kỳ quyết toán
          </p>
        </div>
      </div>

      {/* Main Container with Resizable Splitter */}
      <div
        ref={containerRef}
        className={`items-start ${
          selectedSettlement
            ? 'flex flex-col gap-5 lg:grid lg:gap-0'
            : 'block'
        } ${isDragging ? 'select-none cursor-col-resize' : ''}`}
        style={
          selectedSettlement
            ? {
                gridTemplateColumns: `${listWidth}px 16px minmax(0, 1fr)`,
              }
            : undefined
        }
      >
        {/* Left Column: Filter + Table */}
        <div className="space-y-4 min-w-0 pr-0 lg:pr-1">
          <Card className="p-4 space-y-4">
            {/* Filter and Search Bar */}
            <div
              className={
                selectedSettlement
                  ? 'flex flex-col gap-2'
                  : 'grid gap-3 sm:grid-cols-[1fr_240px]'
              }
            >
              <Input
                aria-label="Tìm kiếm quyết toán"
                placeholder={selectedSettlement ? 'Tìm mã...' : 'Tìm theo mã quyết toán, mã hợp đồng, tên khách, SĐT, STK...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                startAdornment={<Search size={18} className="text-text-muted" />}
              />

              <Combobox
                ariaLabel="Lọc theo trạng thái"
                value={activeStatus}
                onChange={(value) => {
                  setActiveStatus(value as 'all' | SettlementStatus);
                  setPage(1);
                }}
                options={statusOptions}
              />
            </div>

            {/* Table or States */}
            {loading ? (
              <SkeletonLoading variant="table" count={6} />
            ) : error ? (
              <ErrorState title="Lỗi tải dữ liệu" description={error} onRetry={() => void loadData()} />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="Không có bản ghi quyết toán"
                description={
                  searchQuery || activeStatus !== 'all'
                    ? 'Không có kết quả nào khớp với bộ lọc hiện tại.'
                    : 'Chưa có hợp đồng nào đến kỳ quyết toán.'
                }
                action={
                  searchQuery || activeStatus !== 'all' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setActiveStatus('all');
                      }}
                    >
                      Xóa bộ lọc
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <Table
                  columns={selectedSettlement ? compactColumns : fullColumns}
                  data={pagedItems}
                  rowKey="id"
                  selectedRowKey={selectedId}
                  onRowClick={(row) => {
                    setSelectedId(row.id);
                    setTimeout(() => {
                      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                  }}
                />
                {totalPages > 1 && (
                  <div
                    className={`flex items-center border-t border-border pt-3 ${
                      selectedSettlement
                        ? 'flex-col gap-2 justify-center'
                        : 'justify-between'
                    }`}
                  >
                    {!selectedSettlement && (
                      <span className="text-xs text-text-muted">
                        Hiển thị {(page - 1) * PAGE_SIZE + 1} -{' '}
                        {Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} kết quả
                      </span>
                    )}
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={(p) => setPage(p)}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {/* Splitter Divider */}
        {selectedSettlement && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={listWidth}
            aria-valuemin={MIN_LIST_WIDTH}
            aria-valuemax={MAX_LIST_WIDTH}
            aria-label="Kéo để điều chỉnh kích thước giữa danh sách và chi tiết"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleSplitterKeyDown}
            title="Kéo sang trái/phải để điều chỉnh độ rộng danh sách (nhấp đúp để đặt lại mặc định)"
            className={`group relative hidden lg:flex h-full min-h-[450px] w-4 cursor-col-resize items-center justify-center select-none transition-colors focus-visible:outline-none ${
              isDragging ? 'bg-brand-pink-light/30' : 'hover:bg-slate-100/70'
            }`}
          >
            {/* Guide line */}
            <div
              className={`h-full w-[2px] rounded-full transition-colors ${
                isDragging ? 'bg-brand-pink shadow-xs' : 'bg-slate-200 group-hover:bg-brand-pink'
              }`}
            />

            {/* Handle grabber */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 flex h-8 w-3.5 items-center justify-center rounded-full border shadow-2xs transition-colors ${
                isDragging
                  ? 'border-brand-pink bg-brand-pink text-white'
                  : 'border-slate-300 bg-white text-slate-400 group-hover:border-brand-pink group-hover:text-brand-pink'
              }`}
            >
              <GripVertical size={11} aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Right Column: DetailPanel */}
        {selectedSettlement && (
          <div className="w-full pl-0 lg:pl-1 min-w-0">
            <DetailPanel
              panelRef={detailPanelRef}
              title={selectedSettlement.settlementNumber}
              description={
                <span>
                  HĐ: <strong>{selectedSettlement.contractNumber}</strong> · Khách:{' '}
                  <strong>{selectedSettlement.customerName}</strong>
                </span>
              }
              onClose={() => setSelectedId(null)}
              className="w-full border border-border shadow-md"
            >
              <SettlementDetailView
                settlement={selectedSettlement}
                actionLoading={actionLoading}
                onApproveClick={() =>
                  setApprovalModal({
                    open: true,
                    mode: 'approve',
                    settlement: selectedSettlement,
                  })
                }
                onRejectClick={() =>
                  setApprovalModal({
                    open: true,
                    mode: 'reject',
                    settlement: selectedSettlement,
                  })
                }
                onTransferClick={() =>
                  setTransferModal({
                    open: true,
                    settlement: selectedSettlement,
                  })
                }
                onCompleteClick={() => handleComplete(selectedSettlement.id)}
                onPrintClick={() =>
                  setPrintModal({
                    open: true,
                    settlement: selectedSettlement,
                  })
                }
                onViewDocument={(doc) =>
                  setLightboxModal({
                    open: true,
                    document: doc,
                  })
                }
                onUploadDocument={(file) => handleUploadDoc(selectedSettlement.id, file)}
                onDeleteDocument={(docId) => handleDeleteDoc(selectedSettlement.id, docId)}
              />
            </DetailPanel>
          </div>
        )}
      </div>

      {/* Approval & Rejection Modal */}
      <SettlementApprovalModal
        open={approvalModal.open}
        mode={approvalModal.mode}
        settlement={approvalModal.settlement}
        loading={actionLoading}
        onClose={() => setApprovalModal({ open: false, mode: 'approve', settlement: null })}
        onConfirmApprove={handleApprove}
        onConfirmReject={handleReject}
      />

      {/* Transfer Recording Modal */}
      <SettlementTransferModal
        open={transferModal.open}
        settlement={transferModal.settlement}
        loading={actionLoading}
        onClose={() => setTransferModal({ open: false, settlement: null })}
        onConfirmTransfer={handleTransfer}
      />

      {/* Document Lightbox Preview Modal */}
      <SettlementDocumentLightbox
        open={lightboxModal.open}
        document={lightboxModal.document}
        onClose={() => setLightboxModal({ open: false, document: null })}
      />

      {/* Printable Statement Sheet */}
      <SettlementPrintStatement
        open={printModal.open}
        settlement={printModal.settlement}
        onClose={() => setPrintModal({ open: false, settlement: null })}
      />
    </div>
  );
}
