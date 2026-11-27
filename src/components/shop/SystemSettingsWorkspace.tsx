import React, { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { History, RotateCcw, Save, Settings2, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { systemConfigApi, type SystemConfig } from '@/api/systemConfig';
import { auditLogsApi, type AuditLogItem, type PagedAuditLogs } from '@/api/auditLogs';
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  Modal,
  PageHeaderCard,
  Pagination,
  Select,
  SkeletonLoading,
  Table,
  TableDetailButton,
  Toast,
  type TableColumn,
} from '@/components/shared';
import { FunctionPermissions } from './FunctionPermissions';

type SettingsSubTab = 'permissions' | 'parameters' | 'audit-logs';

function dateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function formatChanges(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export const SystemSettingsWorkspace: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManagePermissions = hasPermission('permissions.manage');
  const canReadSettings = hasPermission('settings.read');
  const canUpdateSettings = hasPermission('settings.update');
  const canReadAuditLogs = hasPermission('audit_logs.read');

  const availableTabs: Array<{ id: SettingsSubTab; label: string; icon: React.ReactNode }> = [
    ...(canManagePermissions ? [{ id: 'permissions' as const, label: 'Phân quyền chức năng', icon: <ShieldCheck size={15} /> }] : []),
    ...(canReadSettings ? [{ id: 'parameters' as const, label: 'Cấu hình tham số', icon: <SlidersHorizontal size={15} /> }] : []),
    ...(canReadAuditLogs ? [{ id: 'audit-logs' as const, label: 'Nhật ký quản trị', icon: <History size={15} /> }] : []),
  ];

  const [subTab, setSubTab] = useState<SettingsSubTab>(availableTabs[0]?.id ?? 'permissions');

  if (availableTabs.length === 0) {
    return (
      <Card className="!bg-white p-6">
        <p role="alert" className="text-sm text-state-danger">
          Bạn chưa được cấp quyền truy cập khu vực cấu hình hệ thống.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {availableTabs.map(tab => (
          <Button
            key={tab.id}
            size="sm"
            variant={subTab === tab.id ? 'primary' : 'outline'}
            startIcon={tab.icon}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {subTab === 'permissions' && canManagePermissions && <FunctionPermissions />}
      {subTab === 'parameters' && canReadSettings && <SystemParametersPanel canUpdate={canUpdateSettings} />}
      {subTab === 'audit-logs' && canReadAuditLogs && <AuditLogsPanel />}
    </div>
  );
};

interface SystemConfigDraft {
  consignmentDurationDays: string;
  earlyWithdrawalFeeRate: string;
  payoutAutoConfirmHours: string;
  commissionTierRates: {
    noBrand: string;
    localBrand: string;
    commercial: string;
    luxury: string;
  };
  version: string;
}

const toDraft = (cfg: SystemConfig): SystemConfigDraft => ({
  consignmentDurationDays: String(cfg.consignmentDurationDays),
  earlyWithdrawalFeeRate: String(cfg.earlyWithdrawalFeeRate),
  payoutAutoConfirmHours: String(cfg.payoutAutoConfirmHours),
  commissionTierRates: {
    noBrand: String(cfg.commissionTierRates.noBrand),
    localBrand: String(cfg.commissionTierRates.localBrand),
    commercial: String(cfg.commissionTierRates.commercial),
    luxury: String(cfg.commissionTierRates.luxury),
  },
  version: cfg.version,
});

const parseDraftNumber = (raw: string): number => {
  const trimmed = raw.trim();
  if (!trimmed) return Number.NaN;
  return Number(trimmed);
};

const toConfig = (d: SystemConfigDraft): SystemConfig => ({
  consignmentDurationDays: parseDraftNumber(d.consignmentDurationDays),
  earlyWithdrawalFeeRate: parseDraftNumber(d.earlyWithdrawalFeeRate),
  payoutAutoConfirmHours: parseDraftNumber(d.payoutAutoConfirmHours),
  commissionTierRates: {
    noBrand: parseDraftNumber(d.commissionTierRates.noBrand),
    localBrand: parseDraftNumber(d.commissionTierRates.localBrand),
    commercial: parseDraftNumber(d.commissionTierRates.commercial),
    luxury: parseDraftNumber(d.commissionTierRates.luxury),
  },
  version: d.version,
});

function SystemParametersPanel({ canUpdate }: { canUpdate: boolean }) {
  const [serverConfig, setServerConfig] = useState<SystemConfig | null>(null);
  const [draft, setDraft] = useState<SystemConfigDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await systemConfigApi.get();
      setServerConfig(data);
      setDraft(toDraft(data));
    } catch {
      setError('Không thể tải cấu hình tham số hệ thống. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const validateDraft = (cfg: SystemConfig): string | null => {
    if (!Number.isInteger(cfg.consignmentDurationDays) || cfg.consignmentDurationDays < 1 || cfg.consignmentDurationDays > 365) {
      return 'Thời hạn ký gửi mặc định phải là số nguyên từ 1 đến 365 ngày.';
    }
    if (!Number.isInteger(cfg.payoutAutoConfirmHours) || cfg.payoutAutoConfirmHours < 1 || cfg.payoutAutoConfirmHours > 720) {
      return 'Thời gian Auto-confirm tất toán phải là số nguyên từ 1 đến 720 giờ.';
    }
    if (Number.isNaN(cfg.earlyWithdrawalFeeRate) || cfg.earlyWithdrawalFeeRate < 0 || cfg.earlyWithdrawalFeeRate > 100) {
      return 'Phí rút sớm mặc định phải nằm trong khoảng 0–100%.';
    }
    const tierValues = Object.values(cfg.commissionTierRates);
    if (tierValues.some(v => Number.isNaN(v) || v < 0 || v > 100)) {
      return 'Tỷ lệ hoa hồng theo hạng phải nằm trong khoảng 0–100%.';
    }
    return null;
  };

  const dirty =
    serverConfig !== null &&
    draft !== null &&
    JSON.stringify(toDraft(serverConfig)) !== JSON.stringify(draft);

  const handleSave = async () => {
    if (!draft) return;
    const parsed = toConfig(draft);
    const validationError = validateDraft(parsed);
    if (validationError) {
      setError(validationError);
      setConfirmOpen(false);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const saved = await systemConfigApi.update(parsed);
      setServerConfig(saved);
      setDraft(toDraft(saved));
      setConfirmOpen(false);
      setToastMsg('Đã lưu cấu hình hệ thống và ghi nhận vào nhật ký quản trị.');
    } catch (err) {
      setConfirmOpen(false);
      if (isAxiosError(err) && err.response?.status === 409) {
        setError('Cấu hình vừa được thay đổi ở nơi khác. Vui lòng bấm Tải lại để lấy phiên bản mới nhất.');
      } else if (isAxiosError(err)) {
        const msg = (err.response?.data as { title?: string } | undefined)?.title || err.message;
        setError(`Không thể lưu cấu hình: ${msg}`);
      } else {
        setError('Không thể lưu cấu hình hệ thống.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeaderCard
        icon={<Settings2 size={24} aria-hidden="true" />}
        title="Cấu hình tham số hệ thống"
        description="Thiết lập thời hạn ký gửi mặc định, hoa hồng theo hạng thương hiệu, phí rút sớm và thời gian tự động xác nhận tất toán."
        actions={
          <Button variant="outline" size="sm" startIcon={<RotateCcw size={15} />} onClick={() => void load()} disabled={loading || saving}>
            Tải lại
          </Button>
        }
      />

      {toastMsg && <Toast variant="success" message={toastMsg} onClose={() => setToastMsg('')} />}
      {error && <AlertBanner variant="error" message={error} />}

      {loading && !draft ? (
        <SkeletonLoading variant="cards" count={2} label="Đang tải cấu hình hệ thống..." />
      ) : draft ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="!bg-white !p-5" title="Thời hạn & Thanh toán">
            <div className="space-y-4">
              <Input
                type="number"
                label="Thời hạn ký gửi mặc định (ngày)"
                helperText="Áp dụng gợi ý khi lập hợp đồng ký gửi mới (1 – 365 ngày)."
                min={1}
                max={365}
                disabled={!canUpdate || saving}
                value={draft.consignmentDurationDays}
                onChange={e => setDraft({ ...draft, consignmentDurationDays: e.target.value })}
              />
              <Input
                type="number"
                step="0.5"
                label="Phí rút hàng sớm mặc định (%)"
                helperText="Tỷ lệ phần trăm tính trên giá niêm yết khi rút sớm (0 – 100%)."
                min={0}
                max={100}
                disabled={!canUpdate || saving}
                value={draft.earlyWithdrawalFeeRate}
                onChange={e => setDraft({ ...draft, earlyWithdrawalFeeRate: e.target.value })}
              />
              <Input
                type="number"
                label="Thời gian Auto-confirm tất toán (giờ)"
                helperText="Số giờ sau khi chuyển khoản để Hangfire tự hoàn tất nếu không có khiếu nại mở (1 – 720 giờ)."
                min={1}
                max={720}
                disabled={!canUpdate || saving}
                value={draft.payoutAutoConfirmHours}
                onChange={e => setDraft({ ...draft, payoutAutoConfirmHours: e.target.value })}
              />
            </div>
          </Card>

          <Card className="!bg-white !p-5" title="Hoa hồng mặc định theo hạng thương hiệu (%)">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="number"
                step="0.5"
                label="Không thương hiệu (NoBrand)"
                min={0}
                max={100}
                disabled={!canUpdate || saving}
                value={draft.commissionTierRates.noBrand}
                onChange={e =>
                  setDraft({
                    ...draft,
                    commissionTierRates: { ...draft.commissionTierRates, noBrand: e.target.value },
                  })
                }
              />
              <Input
                type="number"
                step="0.5"
                label="Local Brand"
                min={0}
                max={100}
                disabled={!canUpdate || saving}
                value={draft.commissionTierRates.localBrand}
                onChange={e =>
                  setDraft({
                    ...draft,
                    commissionTierRates: { ...draft.commissionTierRates, localBrand: e.target.value },
                  })
                }
              />
              <Input
                type="number"
                step="0.5"
                label="Thương mại (Commercial)"
                min={0}
                max={100}
                disabled={!canUpdate || saving}
                value={draft.commissionTierRates.commercial}
                onChange={e =>
                  setDraft({
                    ...draft,
                    commissionTierRates: { ...draft.commissionTierRates, commercial: e.target.value },
                  })
                }
              />
              <Input
                type="number"
                step="0.5"
                label="Cao cấp (Luxury)"
                min={0}
                max={100}
                disabled={!canUpdate || saving}
                value={draft.commissionTierRates.luxury}
                onChange={e =>
                  setDraft({
                    ...draft,
                    commissionTierRates: { ...draft.commissionTierRates, luxury: e.target.value },
                  })
                }
              />
            </div>

            {canUpdate && (
              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  disabled={!dirty || saving}
                  onClick={() => serverConfig && setDraft(toDraft(serverConfig))}
                >
                  Hủy thay đổi
                </Button>
                <Button
                  disabled={!dirty || saving}
                  loading={saving}
                  startIcon={<Save size={16} />}
                  onClick={() => setConfirmOpen(true)}
                >
                  Lưu cấu hình
                </Button>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Xác nhận cập nhật cấu hình hệ thống"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={() => void handleSave()} loading={saving}>
              Xác nhận lưu
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink">
          Thay đổi cấu hình sẽ được áp dụng cho các giao dịch mới và được ghi lại trong Nhật ký quản trị. Bạn chắc chắn muốn lưu?
        </p>
      </Modal>
    </div>
  );
}

function AuditLogsPanel() {
  const [data, setData] = useState<PagedAuditLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [actorType, setActorType] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLogItem | null>(null);
  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await auditLogsApi.search({
        from: from || undefined,
        to: to || undefined,
        entityType: entityType || undefined,
        action: action || undefined,
        actorType: actorType || undefined,
        search: search.trim() || undefined,
        page,
        pageSize,
      });
      setData(res);
    } catch {
      setError('Không thể tải nhật ký quản trị. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [action, actorType, entityType, from, page, search, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: TableColumn<AuditLogItem>[] = [
    {
      key: 'occurredAt',
      header: 'Thời gian',
      render: r => <span className="text-xs text-muted tabular-nums">{dateTime(r.occurredAt)}</span>,
    },
    {
      key: 'actor',
      header: 'Người / Tác nhân',
      render: r => (
        <div className="text-xs">
          <p className="font-semibold text-ink">{r.actorName || (r.actorType === 'System' ? 'Hệ thống' : 'Ẩn danh')}</p>
          <p className="text-muted">{r.actorType}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Hành động',
      render: r => (
        <Badge variant={r.action === 'Delete' ? 'danger' : r.action === 'Create' ? 'success' : 'info'}>
          {r.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Đối tượng',
      render: r => (
        <div className="text-xs">
          <p className="font-semibold text-ink">{r.entityType}</p>
          <p className="max-w-[180px] truncate font-mono text-[11px] text-muted">{r.entityId}</p>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Nguồn',
      render: r => <span className="text-xs text-muted">{r.source}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: r => <TableDetailButton onClick={() => setSelected(r)} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeaderCard
        icon={<History size={24} aria-hidden="true" />}
        title="Nhật ký quản trị hệ thống"
        description="Theo dõi các thay đổi quan trọng về cấu hình, phân quyền, tài khoản và giao dịch tài chính."
        actions={
          <Button variant="outline" size="sm" startIcon={<RotateCcw size={15} />} onClick={() => void load()} disabled={loading}>
            Làm mới
          </Button>
        }
      />

      <Card className="!bg-white !p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input
            label="Tìm kiếm"
            placeholder="ID, nguồn, lý do, người sửa..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Đối tượng"
            value={entityType}
            onChange={e => {
              setEntityType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả đối tượng</option>
            <option value="SystemParameter">Cấu hình hệ thống</option>
            <option value="RolePermission">Phân quyền vai trò</option>
            <option value="Account">Tài khoản</option>
            <option value="Payout">Lệnh chi quyết toán</option>
            <option value="Buyout">Phiếu mua đứt</option>
            <option value="ConsignmentContract">Hợp đồng ký gửi</option>
            <option value="IncidentReport">Biên bản sự cố</option>
          </Select>
          <Select
            label="Hành động"
            value={action}
            onChange={e => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả hành động</option>
            <option value="Create">Tạo mới</option>
            <option value="Update">Cập nhật</option>
            <option value="Delete">Xóa</option>
            <option value="PermissionGranted">Cấp quyền</option>
            <option value="PermissionRevoked">Thu hồi quyền</option>
            <option value="RoleAssigned">Gán vai trò</option>
            <option value="RoleRevoked">Thu hồi vai trò</option>
          </Select>
          <Select
            label="Tác nhân"
            value={actorType}
            onChange={e => {
              setActorType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả tác nhân</option>
            <option value="User">Người dùng</option>
            <option value="System">Hệ thống</option>
          </Select>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Từ ngày
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={e => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-control border border-border bg-paper px-3 py-1.5 text-sm text-ink focus:border-brand-pink-focus focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Đến ngày
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={e => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="rounded-control border border-border bg-paper px-3 py-1.5 text-sm text-ink focus:border-brand-pink-focus focus:outline-none"
            />
          </label>
        </div>
      </Card>

      {error && <ErrorState description={error} onRetry={() => void load()} />}

      <Card className="!bg-white !p-4">
        <Table
          columns={columns}
          data={data?.items ?? []}
          rowKey="id"
          loading={loading}
          emptyTitle="Chưa có bản ghi nhật ký phù hợp"
        />
        {data && (
          <Pagination
            className="mt-4"
            page={page}
            totalPages={Math.ceil(data.totalCount / data.pageSize)}
            onPageChange={setPage}
          />
        )}
      </Card>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Chi tiết nhật ký · ${selected.entityType}` : ''}
      >
        {selected && (
          <div className="space-y-3 text-sm text-ink">
            <div className="grid gap-1 text-xs text-muted">
              <p>Thời gian: <strong className="text-ink">{dateTime(selected.occurredAt)}</strong></p>
              <p>Tác nhân: <strong className="text-ink">{selected.actorName || selected.actorType}</strong> ({selected.source})</p>
              <p>Đối tượng: <strong className="font-mono text-ink">{selected.entityId}</strong></p>
              {selected.reason && <p>Lý do: <strong className="text-ink">{selected.reason}</strong></p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted">Chi tiết thay đổi</p>
              <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-surface-subtle p-3 text-xs text-ink">
                {formatChanges(selected.changes)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
