import { useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input, SkeletonLoading, Modal, Toast } from '@/components/shared';
import { rolePermissionsApi, type FunctionPermission, type RolePermissions } from '@/api/rolePermissions';
import { parseProblemDetails } from '@/api/auth';

const groupNames: Record<string, string> = {
  accounts: 'Tài khoản',
  appointments: 'Lịch hẹn',
  customers: 'Khách hàng',
  products: 'Kho hàng',
  sales: 'Bán hàng',
  reports: 'Báo cáo',
  settings: 'Cấu hình',
  screens: 'Màn hình được hiển thị',
  permissions: 'Phân quyền',
};

function groupName(code: string) {
  const prefix = code.split('.')[0];
  return groupNames[prefix] ?? prefix;
}

export function FunctionPermissions() {
  const [permissions, setPermissions] = useState<FunctionPermission[]>([]);
  const [roles, setRoles] = useState<RolePermissions[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  const activeRole = roles.find(role => role.id === activeRoleId);
  const availablePermissions = useMemo(() => permissions.filter(permission =>
    activeRole && permission.allowedRoleCodes.includes(activeRole.code)
  ), [permissions, activeRole]);
  const selectedCodes = useMemo(() => new Set(draft), [draft]);
  const protectedCodes = useMemo(() => new Set(activeRole?.isProtected
    ? permissions.filter(permission => permission.isRequiredForAdmin).map(permission => permission.code)
    : []), [activeRole, permissions]);
  const changed = activeRole ? (
    draft.length !== activeRole.permissionCodes.length ||
    draft.some(code => !activeRole.permissionCodes.includes(code))
  ) : false;

  const groups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    const filtered = availablePermissions.filter(permission =>
      !query || `${permission.name} ${permission.code} ${permission.description ?? ''}`.toLocaleLowerCase('vi').includes(query)
    );
    const grouped = new Map<string, FunctionPermission[]>();
    filtered.forEach(permission => {
      const name = groupName(permission.code);
      grouped.set(name, [...(grouped.get(name) ?? []), permission]);
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi'));
  }, [availablePermissions, search]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [availablePermissions, availableRoles] = await Promise.all([
        rolePermissionsApi.getPermissions(),
        rolePermissionsApi.getRoles(),
      ]);
      setPermissions(availablePermissions);
      setRoles(availableRoles);
      const role = availableRoles.find(item => item.id === activeRoleId) ?? availableRoles[0];
      setActiveRoleId(role?.id ?? null);
      setDraft(role?.permissionCodes ?? []);
    } catch {
      setError('Không thể tải danh sách vai trò và quyền. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function selectRole(roleId: string) {
    if (roleId === activeRoleId) return;
    if (changed) {
      setPendingRoleId(roleId);
      return;
    }
    const role = roles.find(item => item.id === roleId);
    setActiveRoleId(roleId);
    setDraft(role?.permissionCodes ?? []);
    setSearch('');
    setNotice(null);
  }

  function togglePermission(code: string) {
    if (protectedCodes.has(code)) return;
    setDraft(current => current.includes(code) ? current.filter(item => item !== code) : [...current, code]);
    setNotice(null);
  }

  function toggleGroup(items: FunctionPermission[]) {
    const codes = items.filter(item => !protectedCodes.has(item.code)).map(item => item.code);
    if (codes.length === 0) return;
    const allSelected = codes.every(code => selectedCodes.has(code));
    setDraft(current => allSelected
      ? current.filter(code => !codes.includes(code))
      : [...new Set([...current, ...codes])]);
    setNotice(null);
  }

  async function save() {
    if (!activeRole || !changed) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await rolePermissionsApi.update(activeRole.id, draft, activeRole.permissionCodes);
      setRoles(current => current.map(role => role.id === updated.id ? updated : role));
      setDraft(updated.permissionCodes);
      setConfirmSave(false);
      setNotice(`Đã lưu quyền cho vai trò ${updated.name}.`);
    } catch (cause) {
      setConfirmSave(false);
      setError(parseProblemDetails(cause).title ?? 'Không thể lưu phân quyền. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SkeletonLoading variant="permissions" label="Đang tải phân quyền..." />;
  if (error && roles.length === 0) return <Card><ErrorState title="Không thể tải phân quyền" description={error} onRetry={() => void load()} /></Card>;

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-4 bg-brand-pink-surface">
        <span className="rounded-xl bg-paper p-3 text-brand-highlight"><ShieldCheck size={24} aria-hidden="true" /></span>
        <div>
          <h2 className="text-lg font-bold text-ink">Phân quyền theo chức năng</h2>
          <p className="text-sm text-muted">Chọn vai trò, sau đó chọn các chức năng vai trò đó được phép sử dụng.</p>
        </div>
      </Card>

      {error && <div className="flex flex-wrap items-center gap-3"><Toast variant="error" message={error} onClose={() => setError(null)} className="max-w-none flex-1" /><Button variant="outline" onClick={() => void load()}>Tải lại</Button></div>}
      {notice && <Toast variant="success" message={notice} onClose={() => setNotice(null)} className="max-w-none" />}

      {roles.length === 0 ? <Card><EmptyState title="Chưa có vai trò" description="Chưa có vai trò nào để thiết lập quyền." /></Card> : (
        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card title="Vai trò" description="Chọn một vai trò để xem và chỉnh quyền." className="lg:sticky lg:top-5">
            <div className="space-y-2" aria-label="Danh sách vai trò">
              {roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  aria-pressed={role.id === activeRoleId}
                  onClick={() => selectRole(role.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-brand-pink-focus ${role.id === activeRoleId ? 'border-brand-pink bg-brand-pink-surface text-brand-ink' : 'border-border bg-paper text-ink hover:border-brand-lavender hover:bg-brand-pink-surface/40'}`}
                >
                  <span><strong className="block text-sm">{role.name}</strong><span className="text-xs text-muted">{role.code}</span></span>
                  <Badge variant="info">{role.permissionCodes.length} quyền</Badge>
                </button>
              ))}
            </div>
          </Card>

          {activeRole && <Card className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Thiết lập quyền</p>
                <h2 className="mt-1 text-xl font-bold text-ink">{activeRole.name}</h2>
                {activeRole.description && <p className="mt-1 text-sm text-muted">{activeRole.description}</p>}
              </div>
              <Badge variant="info">{draft.length}/{availablePermissions.length} quyền</Badge>
            </div>
            {activeRole.isProtected && <p className="mt-4 rounded-xl border border-brand-lavender/40 bg-brand-pink-surface p-3 text-sm text-brand-ink">Admin mặc định chỉ có các quyền quản trị cốt lõi. Những quyền này luôn có hiệu lực; các quyền khác có thể bật hoặc tắt theo nhu cầu.</p>}

            <div className="mt-5 max-w-md">
              <Input label="Tìm chức năng" placeholder="Tên chức năng hoặc mã quyền" value={search} onChange={event => setSearch(event.target.value)} startAdornment={<Search size={17} />} />
            </div>

            <div className="mt-5 space-y-4">
              {groups.length === 0 ? <EmptyState title={availablePermissions.length === 0 ? 'Chưa có chức năng' : 'Không tìm thấy chức năng'} description={availablePermissions.length === 0 ? 'Vai trò này chưa có chức năng để gán.' : 'Thử từ khóa khác.'} /> : groups.map(([name, items]) => {
                const selectedCount = items.filter(item => selectedCodes.has(item.code)).length;
                return <section key={name} className="overflow-hidden rounded-xl border border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-pink-surface px-4 py-3">
                    <div><h3 className="font-semibold text-ink">{name}</h3><p className="text-xs text-muted">Đã chọn {selectedCount}/{items.length} chức năng</p></div>
                    {items.some(item => !protectedCodes.has(item.code)) && <Button size="sm" variant="ghost" onClick={() => toggleGroup(items)}>{selectedCount === items.length ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}</Button>}
                  </div>
                  <div className="divide-y divide-border">
                    {items.map(permission => <label key={permission.code} className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-brand-pink-surface/30">
                      <input type="checkbox" checked={selectedCodes.has(permission.code)} disabled={protectedCodes.has(permission.code)} onChange={() => togglePermission(permission.code)} className="mt-1 size-4 accent-brand-highlight" />
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{permission.name}{protectedCodes.has(permission.code) && <span className="ml-2 text-xs font-medium text-brand-ink">Bắt buộc</span>}</span>{permission.description && <span className="mt-0.5 block text-xs text-muted">{permission.description}</span>}<span className="mt-1 block font-mono text-xs text-muted">{permission.code}</span></span>
                      {selectedCodes.has(permission.code) && <Check size={16} className="mt-1 shrink-0 text-state-success-strong" aria-hidden="true" />}
                    </label>)}
                  </div>
                </section>;
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <p className="text-xs text-muted">{changed ? 'Bạn có thay đổi chưa lưu.' : 'Các quyền đã được lưu.'}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!changed} onClick={() => setDraft(activeRole.permissionCodes)} startIcon={<RotateCcw size={16} />}>Hoàn tác</Button>
                <Button disabled={!changed} onClick={() => setConfirmSave(true)}>Lưu phân quyền</Button>
              </div>
            </div>
          </Card>}
        </div>
      )}

      <Modal open={confirmSave} onClose={() => setConfirmSave(false)} title="Xác nhận phân quyền" description={activeRole?.name} loading={saving} footer={<><Button variant="outline" disabled={saving} onClick={() => setConfirmSave(false)}>Quay lại</Button><Button loading={saving} onClick={() => void save()}>Xác nhận lưu</Button></>}>
        <p className="text-sm text-ink">Quyền của vai trò này sẽ được cập nhật cho mọi tài khoản đang có vai trò đó.</p>
      </Modal>
      <Modal open={!!pendingRoleId} onClose={() => setPendingRoleId(null)} title="Thay đổi chưa lưu" footer={<><Button variant="outline" onClick={() => setPendingRoleId(null)}>Tiếp tục chỉnh sửa</Button><Button onClick={() => { const role = roles.find(item => item.id === pendingRoleId); setActiveRoleId(role?.id ?? null); setDraft(role?.permissionCodes ?? []); setSearch(''); setPendingRoleId(null); setNotice(null); }}>Bỏ thay đổi</Button></>}>
        <p className="text-sm text-ink">Bạn đang chỉnh quyền của {activeRole?.name}. Chuyển vai trò sẽ bỏ các thay đổi chưa lưu.</p>
      </Modal>
    </div>
  );
}
