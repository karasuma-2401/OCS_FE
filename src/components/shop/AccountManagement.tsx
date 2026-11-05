import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Eye, EyeOff, Plus, RefreshCw, Search, Users } from 'lucide-react';
import { accountsApi, type AccountHistoryItem, type AccountSummary, type AccountStatus, type CreateInternalAccount, type PagedAccountHistory, type PagedAccounts, type UpdateAccountRequest, type UpdateEmployeeProfileRequest } from '@/api/accounts';
import { parseProblemDetails, extractFieldError } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import type { RoleCode } from '@/types';
import { validateEmail, validateFullName, validatePasswordPolicy, validatePhoneNumber } from '@/utils/validation';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Loading, Modal, Pagination, Select, Toast } from '@/components/shared';

type InternalRole = 'Admin' | 'Manager' | 'Staff';
type Action = { account: AccountSummary; label: string; run: () => Promise<AccountSummary>; impact: string };
const roleOptions: InternalRole[] = ['Admin', 'Manager', 'Staff'];
const statusOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'Mọi trạng thái' }, { value: '0', label: 'Chờ kích hoạt' },
  { value: '1', label: 'Đang hoạt động' }, { value: '2', label: 'Đã khóa' }, { value: '3', label: 'Vô hiệu hóa' },
];
const statusNames: Record<AccountStatus, string> = { PendingActivation: 'Chờ kích hoạt', Active: 'Hoạt động', Locked: 'Đã khóa', Deactivated: 'Vô hiệu hóa' };
const statusVariants = { PendingActivation: 'warning', Active: 'success', Locked: 'danger', Deactivated: 'neutral' } as const;
const blankForm: CreateInternalAccount = { fullName: '', email: '', phoneNumber: '', username: '', password: '', jobTitle: '', hiredOn: '' };

function todayLocalDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function errorMessage(error: unknown) {
  const problem = parseProblemDetails(error);
  if (problem.code === 'AUTH.CSRF_INVALID') return 'Phiên bảo mật đã thay đổi. Vui lòng thử lại.';
  if (problem.status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (problem.status === 404) return 'Tài khoản không trong phạm vi quản lý.';
  if (problem.code === 'ACCOUNT.LAST_ADMIN') return 'Không thể thay đổi Admin đang hoạt động cuối cùng.';
  if (problem.code === 'ACCOUNT.PROTECTED_ADMIN') return 'Không thể thực hiện thao tác này với Admin gốc ocs_admin.';
  if (problem.code === 'ACCOUNT.SELF_PASSWORD_RESET') return 'Bạn không thể đặt lại mật khẩu của chính mình từ màn hình này.';
  if (problem.code === 'ACCOUNT.INVALID_ROLE') return 'Vai trò lọc không hợp lệ.';
  if (problem.code === 'ACCOUNT.IDENTITY_EXISTS') return 'Email, username hoặc số điện thoại đã tồn tại.';
  return problem.title || 'Thao tác không thành công. Vui lòng thử lại.';
}

export function AccountManagement() {
  const { user, retryBootstrap, revalidateSession } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.roles.includes('Admin') ?? false;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'customer' | 'internal'>('internal');
  const [status, setStatus] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleCode | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<PagedAccounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const quietRefreshRef = useRef(false);
  const [notice, setNotice] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateInternalAccount>(blankForm);
  const [createRole, setCreateRole] = useState<InternalRole>('Staff');
  const [useDefaultPassword, setUseDefaultPassword] = useState(true);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<AccountSummary | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [chosenRoles, setChosenRoles] = useState<InternalRole[]>([]);
  const [editing, setEditing] = useState<{ account: AccountSummary; kind: 'account' | 'profile' } | null>(null);
  const [editAccountForm, setEditAccountForm] = useState<UpdateAccountRequest>({ fullName: '', email: '', phoneNumber: '', username: null });
  const [editProfileForm, setEditProfileForm] = useState<UpdateEmployeeProfileRequest>({ fullName: '', phoneNumber: '', jobTitle: '', hiredOn: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [resetTarget, setResetTarget] = useState<AccountSummary | null>(null);
  const [resetUseDefault, setResetUseDefault] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAccountId, setHistoryAccountId] = useState<string | undefined>();
  const [historyReturnAccount, setHistoryReturnAccount] = useState<AccountSummary | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [historyData, setHistoryData] = useState<PagedAccountHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const handleError = useCallback((error: unknown) => {
    const problem = parseProblemDetails(error);
    if (problem.status === 401) navigate('/login?from=%2Fadmin%2Faccounts', { replace: true });
    return errorMessage(error);
  }, [navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let alive = true;
    const quiet = quietRefreshRef.current;
    quietRefreshRef.current = false;
    if (!quiet) { setLoading(true); setLoadError(null); }
    accountsApi.list({ page, pageSize, search: search || undefined, accountType: isAdmin ? (activeTab === 'customer' ? 0 : 1) : undefined, status: status ? Number(status) : undefined, role: roleFilter || undefined })
      .then(result => { if (alive) { setData(result); setLoadError(null); } })
      .catch(error => { if (alive) { const message = handleError(error); if (quiet) setNotice({ variant: 'error', message: `Không thể đồng bộ danh sách: ${message}` }); else setLoadError(message); } })
      .finally(() => { if (alive && !quiet) setLoading(false); });
    return () => { alive = false; };
  }, [page, pageSize, search, activeTab, status, roleFilter, isAdmin, refreshKey, handleError]);

  useEffect(() => {
    if (!historyOpen || !isAdmin) return;
    let alive = true;
    setHistoryLoading(true); setHistoryError(null);
    accountsApi.history({ page: historyPage, pageSize: 20, accountId: historyAccountId })
      .then(result => { if (alive) setHistoryData(result); })
      .catch(error => { if (alive) setHistoryError(handleError(error)); })
      .finally(() => { if (alive) setHistoryLoading(false); });
    return () => { alive = false; };
  }, [historyOpen, historyAccountId, historyPage, historyRefreshKey, isAdmin, handleError]);

  const refresh = (quiet = false) => { quietRefreshRef.current = quiet; setRefreshKey(value => value + 1); };
  const updateAccount = (account: AccountSummary) => {
    setData(current => current ? { ...current, items: current.items.map(item => item.id === account.id ? account : item) } : current);
    setChosenRoles(account.roles.filter((role): role is InternalRole => roleOptions.includes(role as InternalRole)));
  };
  const changeTab = (tab: 'customer' | 'internal') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSearchInput(''); setSearch(''); setStatus(''); setRoleFilter(''); setPage(1);
    setSelected(null); setSelectedRowId(null); setNotice(null);
  };
  const updateForm = (key: keyof CreateInternalAccount, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setFieldErrors(current => ({ ...current, [key]: '' }));
  };
  const openCreate = () => {
    setForm({ ...blankForm, hiredOn: todayLocalDate() });
    setCreateRole('Staff'); setUseDefaultPassword(true); setShowCreatePassword(false);
    setFieldErrors({}); setFormError(null); setCreateOpen(true);
  };
  const changePasswordMode = (useDefault: boolean) => {
    setUseDefaultPassword(useDefault);
    setForm(current => ({ ...current, password: '' }));
    setFieldErrors(current => ({ ...current, password: '' }));
    setShowCreatePassword(false);
  };
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const errors: Record<string, string> = {};
    const required = ['username', 'jobTitle', 'hiredOn'] as const;
    for (const key of required) if (!form[key].trim()) errors[key] = 'Vui lòng nhập thông tin này.';
    errors.fullName = validateFullName(form.fullName) || '';
    errors.email = validateEmail(form.email) || '';
    errors.phoneNumber = validatePhoneNumber(form.phoneNumber) || '';
    if (!useDefaultPassword) errors.password = validatePasswordPolicy(form.password) || '';
    if (Object.values(errors).some(Boolean)) { setFieldErrors(errors); return; }
    setSubmitting(true); setFormError(null);
    try {
      const created = await accountsApi.create({ ...form, fullName: form.fullName.trim(), email: form.email.trim(), phoneNumber: form.phoneNumber.trim(), username: form.username.trim(), jobTitle: form.jobTitle.trim(), password: useDefaultPassword ? null : form.password, useDefaultPassword }, createRole, isAdmin);
      setCreateOpen(false); setForm(blankForm); setPage(1); setSelected(created); setSelectedRowId(created.id); refresh(true);
      setNotice({ variant: 'success', message: 'Đã tạo tài khoản. Người được cấp tài khoản cần đăng nhập, xác thực OTP rồi đăng nhập lại.' });
    } catch (error) {
      const problem = parseProblemDetails(error);
      const serverErrors: Record<string, string> = {};
      for (const key of Object.keys(blankForm)) serverErrors[key] = extractFieldError(problem.errors, key) || '';
      setFieldErrors(serverErrors);
      setFormError(problem.status === 409 ? 'Email, username hoặc số điện thoại đã tồn tại.' : handleError(error));
    } finally { setSubmitting(false); }
  };

  const view = async (account: AccountSummary) => {
    setNotice(null);
    setSelectedRowId(account.id);
    setSelected(account); setChosenRoles(account.roles.filter((role): role is InternalRole => roleOptions.includes(role as InternalRole)));
    setDetailLoading(true);
    try {
      const current = await accountsApi.get(account.id);
      setSelected(current); setChosenRoles(current.roles.filter((role): role is InternalRole => roleOptions.includes(role as InternalRole)));
    } catch (error) { setSelected(null); setNotice({ variant: 'error', message: handleError(error) }); }
    finally { setDetailLoading(false); }
  };

  const openEditAccount = (account: AccountSummary) => {
    setSelected(null); setEditError(null); setEditErrors({});
    setEditAccountForm({ fullName: account.fullName, email: account.email || '', phoneNumber: account.phoneNumber, username: account.accountType === 'Customer' ? null : account.username || '' });
    setEditing({ account, kind: 'account' });
  };
  const returnToDetail = () => {
    if (editing && !editSubmitting && !editLoading) { setSelected(editing.account); setEditing(null); }
  };
  const openEditProfile = async (account: AccountSummary) => {
    setSelected(null); setEditError(null); setEditErrors({});
    setEditing({ account, kind: 'profile' }); setEditLoading(true);
    try {
      const profile = await accountsApi.getEmployeeProfile(account.id);
      setEditProfileForm({ fullName: profile.fullName, phoneNumber: profile.phoneNumber, jobTitle: profile.jobTitle, hiredOn: profile.hiredOn.slice(0, 10) });
    } catch (error) {
      setEditing(null); setSelected(account); setNotice({ variant: 'error', message: handleError(error) });
    } finally { setEditLoading(false); }
  };
  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || editSubmitting) return;
    const errors: Record<string, string> = {};
    const form = editing.kind === 'account' ? editAccountForm : editProfileForm;
    errors.fullName = validateFullName(form.fullName) || '';
    errors.phoneNumber = validatePhoneNumber(form.phoneNumber) || '';
    if (editing.kind === 'account') {
      errors.email = validateEmail(editAccountForm.email) || '';
      if (editing.account.accountType === 'Internal' && !editAccountForm.username?.trim()) errors.username = 'Vui lòng nhập username.';
    } else {
      if (!editProfileForm.jobTitle.trim()) errors.jobTitle = 'Vui lòng nhập chức danh.';
      if (!editProfileForm.hiredOn) errors.hiredOn = 'Vui lòng chọn ngày vào làm.';
    }
    if (Object.values(errors).some(Boolean)) { setEditErrors(errors); return; }
    setEditSubmitting(true); setEditError(null); setEditErrors({});
    try {
      let updated: AccountSummary;
      let identityChanged = false;
      if (editing.kind === 'account') {
        const payload: UpdateAccountRequest = { fullName: editAccountForm.fullName.trim(), email: editAccountForm.email.trim(), phoneNumber: editAccountForm.phoneNumber.trim(), username: editing.account.accountType === 'Customer' ? null : editAccountForm.username?.trim() || '' };
        identityChanged = payload.email !== editing.account.email || payload.username !== editing.account.username;
        updated = await accountsApi.update(editing.account.id, payload);
        if (editing.account.id === user?.id) {
          if (identityChanged) await retryBootstrap();
          else await revalidateSession();
        }
      } else {
        const profile = await accountsApi.updateEmployeeProfile(editing.account.id, { fullName: editProfileForm.fullName.trim(), phoneNumber: editProfileForm.phoneNumber.trim(), jobTitle: editProfileForm.jobTitle.trim(), hiredOn: editProfileForm.hiredOn });
        updated = { ...editing.account, fullName: profile.fullName, phoneNumber: profile.phoneNumber };
      }
      updateAccount(updated); setEditing(null); refresh(true);
      setNotice({ variant: 'success', message: 'Đã cập nhật thông tin tài khoản.' });
      if (editing.account.id === user?.id && identityChanged) navigate('/login?from=%2Fadmin%2Faccounts', { replace: true });
      else setSelected(updated);
    } catch (error) {
      const problem = parseProblemDetails(error);
      const serverErrors: Record<string, string> = {};
      for (const key of ['fullName', 'email', 'phoneNumber', 'username', 'jobTitle', 'hiredOn']) serverErrors[key] = extractFieldError(problem.errors, key) || '';
      setEditErrors(serverErrors);
      setEditError(handleError(error));
      if (problem.status === 409) refresh(true);
    } finally { setEditSubmitting(false); }
  };

  const openPasswordReset = (account: AccountSummary) => {
    setSelected(null);
    setResetTarget(account);
    setResetUseDefault(account.accountType === 'Internal');
    setResetPassword(''); setResetPasswordVisible(false); setResetConfirming(false); setResetError(null);
  };
  const submitPasswordReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!resetTarget || resetSubmitting) return;
    if (!resetConfirming) {
      if (!resetUseDefault) {
        const validationError = validatePasswordPolicy(resetPassword);
        if (validationError) { setResetError(validationError); return; }
      }
      setResetError(null); setResetConfirming(true); return;
    }
    setResetSubmitting(true); setResetError(null);
    try {
      await accountsApi.resetPassword(resetTarget.id, resetUseDefault ? null : resetPassword, resetUseDefault);
      setResetTarget(null); setResetPassword(''); setResetConfirming(false); setSelected(resetTarget);
      setNotice({ variant: 'success', message: 'Đã đặt lại mật khẩu. Các phiên đăng nhập của tài khoản đã bị thu hồi.' });
    } catch (error) { setResetError(handleError(error)); }
    finally { setResetSubmitting(false); }
  };
  const closePasswordReset = () => {
    if (resetSubmitting) return;
    setResetTarget(null); setResetPassword(''); setResetConfirming(false);
    if (resetTarget) setSelected(resetTarget);
  };
  const openHistory = (accountId?: string) => {
    const returnAccount = accountId ? selected : null;
    setHistoryReturnAccount(returnAccount);
    if (returnAccount) setSelected(null);
    setHistoryAccountId(accountId); setHistoryPage(1); setHistoryData(null); setHistoryOpen(true);
  };
  const closeHistory = () => { setHistoryOpen(false); if (historyReturnAccount) setSelected(historyReturnAccount); setHistoryReturnAccount(null); };

  const runAction = async () => {
    if (!action || submitting) return;
    setSubmitting(true);
    try {
      const updated = await action.run();
      updateAccount(updated); setAction(null); refresh(true);
      setNotice({ variant: 'success', message: `${action.label} thành công.` });
      if (updated.id === user?.id && action.label === 'Đổi vai trò') {
        await retryBootstrap();
        navigate('/login?from=%2Fadmin%2Faccounts', { replace: true });
      } else setSelected(updated);
    } catch (error) {
      setSelected(action.account); setAction(null); refresh(true); setNotice({ variant: 'error', message: handleError(error) });
    } finally { setSubmitting(false); }
  };

  const queueStatus = (account: AccountSummary, label: string, run: () => Promise<AccountSummary>, impact: string) => { setSelected(null); setAction({ account, label, run, impact }); };
  const returnFromAction = () => { if (action && !submitting) { setSelected(action.account); setAction(null); } };
  const canManage = (account: AccountSummary) => !account.isProtected && account.id !== user?.id && (isAdmin || (account.accountType === 'Internal' && account.roles.length === 1 && account.roles[0] === 'Staff'));
  const rolesChanged = selected && [...selected.roles].sort().join('|') !== [...chosenRoles].sort().join('|');
  const date = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value));

  return <div className="space-y-5">
    {notice && !selected && <Toast variant={notice.variant} message={notice.message} onClose={() => setNotice(null)} />}
    <Card className="bg-gradient-to-r from-brand-pink-surface to-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="shrink-0 rounded-xl bg-brand-pink-light p-3 text-brand-highlight"><Users size={24} /></span><div><h2 className="text-lg font-bold text-brand-ink">Quản lý tài khoản</h2><p className="text-sm text-muted">{isAdmin ? 'Quản lý khách hàng và nhân sự nội bộ.' : 'Quản lý tài khoản nhân viên Staff.'}</p></div></div>
        <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">
          {isAdmin && <Button variant="outline" onClick={() => openHistory()} startIcon={<Clock3 size={16} />}>Lịch sử thao tác</Button>}
          {(!isAdmin || activeTab === 'internal') && <Button onClick={openCreate} startIcon={<Plus size={16} />}>{isAdmin ? 'Tạo tài khoản nội bộ' : 'Tạo nhân viên'}</Button>}
        </div>
      </div>
    </Card>
    <Card>
      {isAdmin ? <div className="mb-5 flex gap-1 border-b border-border" role="tablist" aria-label="Loại tài khoản">
        <button id="accounts-customer-tab" type="button" role="tab" aria-selected={activeTab === 'customer'} aria-controls="accounts-panel" onClick={() => changeTab('customer')} className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'customer' ? 'border-brand-pink text-brand-ink' : 'border-transparent text-muted hover:text-brand-highlight'}`}>Khách hàng</button>
        <button id="accounts-internal-tab" type="button" role="tab" aria-selected={activeTab === 'internal'} aria-controls="accounts-panel" onClick={() => changeTab('internal')} className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'internal' ? 'border-brand-pink text-brand-ink' : 'border-transparent text-muted hover:text-brand-highlight'}`}>Nội bộ cửa hàng</button>
      </div> : <h2 className="mb-5 text-base font-bold text-brand-ink">Nhân viên Staff</h2>}
      <div id="accounts-panel" role={isAdmin ? 'tabpanel' : undefined} aria-labelledby={isAdmin ? `accounts-${activeTab}-tab` : undefined}>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><Input label="Tìm kiếm" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Tên, email, số điện thoại, username" startAdornment={<Search size={16} />} /></div>
        <div className="w-44"><Select label="Trạng thái" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>{statusOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
        {isAdmin && activeTab === 'internal' && <div className="w-44"><Select label="Vai trò" value={roleFilter} onChange={e => { setRoleFilter(e.target.value as RoleCode | ''); setPage(1); }}><option value="">Mọi vai trò</option>{(['Admin', 'Manager', 'Staff'] as RoleCode[]).map(role => <option key={role} value={role}>{role}</option>)}</Select></div>}
        <div className="w-32"><Select label="Mỗi trang" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option></Select></div>
        <Button variant="outline" aria-label="Tải lại danh sách" onClick={() => refresh()} startIcon={<RefreshCw size={16} />}>Tải lại</Button>
      </div>
      {loadError ? <ErrorState title="Không thể tải tài khoản" description={loadError} onRetry={() => refresh()} /> : loading ? <Loading label="Đang tải tài khoản..." className="py-12" /> : !data?.items.length ? <EmptyState title="Không tìm thấy tài khoản" description="Thử đổi từ khóa hoặc bộ lọc." /> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[840px] text-left text-sm"><thead className="border-b border-border bg-brand-pink-surface text-xs uppercase tracking-wide text-muted"><tr>{['STT', 'Họ tên', 'Email', 'Số điện thoại', 'Vai trò', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(item => <th key={item} scope="col" className="px-3 py-3 font-semibold">{item}</th>)}</tr></thead><tbody className="divide-y divide-border">{data.items.map((account, index) => <tr key={account.id} tabIndex={0} aria-selected={selectedRowId === account.id} onClick={() => void view(account)} onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void view(account); } }} className={`cursor-pointer outline-none focus-visible:bg-brand-pink-surface ${selectedRowId === account.id ? 'bg-brand-pink-surface/70' : 'hover:bg-brand-pink-surface/50'}`}><td className="relative px-3 py-3 text-muted">{selectedRowId === account.id && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 rounded-r" style={{ background: 'linear-gradient(180deg, var(--color-brand-pink-gradient), var(--color-brand-lavender-gradient) 52%, var(--color-brand-blue-gradient))' }} />}{(page - 1) * pageSize + index + 1}</td><td className="px-3 py-3 font-semibold text-ink">{account.fullName}{account.isProtected && <span className="ml-2 text-xs font-normal text-brand-highlight">ADMIN</span>}</td><td className="px-3 py-3">{account.email || '—'}</td><td className="px-3 py-3">{account.phoneNumber}</td><td className="px-3 py-3">{account.roles.join(', ')}</td><td className="px-3 py-3"><Badge variant={statusVariants[account.status]}>{statusNames[account.status]}</Badge></td><td className="px-3 py-3">{date(account.createdAt)}</td><td className="px-3 py-3"><Button size="sm" variant="outline" onClick={event => { event.stopPropagation(); void view(account); }}>Chi tiết</Button></td></tr>)}</tbody></table></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">{data.totalCount} tài khoản · Trang {data.page}/{data.totalPages}</p><Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} /></div>
      </>}
      </div>
    </Card>

    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo tài khoản nội bộ" description="Người được cấp tài khoản sẽ kích hoạt qua OTP ở lần đăng nhập đầu." loading={submitting} footer={<><Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Hủy</Button><Button type="submit" form="account-create-form" loading={submitting}>Tạo tài khoản</Button></>}>
      <form id="account-create-form" onSubmit={e => void create(e)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Họ tên" required value={form.fullName} onChange={e => updateForm('fullName', e.target.value)} error={fieldErrors.fullName} />
        <Input label="Email" type="email" required value={form.email} onChange={e => updateForm('email', e.target.value)} error={fieldErrors.email} />
        <Input label="Số điện thoại" required value={form.phoneNumber} onChange={e => updateForm('phoneNumber', e.target.value)} error={fieldErrors.phoneNumber} />
        <Input label="Username" required value={form.username} onChange={e => updateForm('username', e.target.value)} error={fieldErrors.username} />
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink">Cách đặt mật khẩu</p>
          <div role="radiogroup" aria-label="Cách đặt mật khẩu" className="grid gap-2 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm transition ${useDefaultPassword ? 'border-brand-pink bg-brand-pink-surface text-brand-ink' : 'border-border bg-paper text-muted hover:border-brand-lavender'}`}>
              <input type="radio" name="create-password-mode" checked={useDefaultPassword} onChange={() => changePasswordMode(true)} className="mt-0.5 accent-brand-highlight" />
              <span><strong className="block">Mật khẩu mặc định</strong><span className="text-xs">Ocs@123456</span></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm transition ${!useDefaultPassword ? 'border-brand-pink bg-brand-pink-surface text-brand-ink' : 'border-border bg-paper text-muted hover:border-brand-lavender'}`}>
              <input type="radio" name="create-password-mode" checked={!useDefaultPassword} onChange={() => changePasswordMode(false)} className="mt-0.5 accent-brand-highlight" />
              <span><strong className="block">Mật khẩu tự đặt</strong><span className="text-xs">Nhập mật khẩu riêng cho tài khoản này</span></span>
            </label>
          </div>
        </div>
        {!useDefaultPassword && <Input label="Mật khẩu" type={showCreatePassword ? 'text' : 'password'} autoComplete="new-password" required value={form.password} onChange={e => updateForm('password', e.target.value)} error={fieldErrors.password} helperText="8–70 ký tự, chữ hoa, chữ thường, số hoặc ký tự đặc biệt; tối đa 72 byte." endAdornment={<button type="button" aria-label={showCreatePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showCreatePassword} onClick={() => setShowCreatePassword(value => !value)} className="rounded p-1 text-muted hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-pink-focus">{showCreatePassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />}
        <Input label="Chức danh" required value={form.jobTitle} onChange={e => updateForm('jobTitle', e.target.value)} error={fieldErrors.jobTitle} />
        <Input label="Ngày vào làm" type="date" required value={form.hiredOn} onChange={e => updateForm('hiredOn', e.target.value)} error={fieldErrors.hiredOn} />
        {isAdmin && <Select label="Vai trò" value={createRole} onChange={e => setCreateRole(e.target.value as InternalRole)}>{roleOptions.map(role => <option key={role} value={role}>{role}</option>)}</Select>}
        {formError && <p role="alert" className="sm:col-span-2 text-sm text-state-danger">{formError}</p>}
      </form>
    </Modal>

    <Modal open={!!selected} onClose={() => setSelected(null)} title="Chi tiết tài khoản" description={selected?.email || selected?.fullName} loading={detailLoading} footer={<Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button>}>
      {selected && <div className="space-y-5 text-sm">
        {notice && <Toast variant={notice.variant} message={notice.message} onClose={() => setNotice(null)} />}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-brand-pink-surface p-4"><span>Họ tên<br /><strong>{selected.fullName}</strong></span><span>Số điện thoại<br /><strong>{selected.phoneNumber}</strong></span><span>Loại tài khoản<br /><strong>{selected.accountType === 'Internal' ? 'Nội bộ' : 'Khách hàng'}</strong></span><span>Trạng thái<br /><Badge variant={statusVariants[selected.status]}>{statusNames[selected.status]}</Badge></span></div>
        {selected.isProtected && <p className="rounded-lg bg-state-info-soft p-3 text-state-info">Admin gốc được bảo vệ. Có thể sửa tên và số điện thoại; không thể đổi email, username, trạng thái hoặc vai trò.</p>}
        <div className="flex flex-wrap gap-2">
          {isAdmin && <Button size="sm" variant="outline" onClick={() => openEditAccount(selected)}>Sửa thông tin tài khoản</Button>}
          {selected.accountType === 'Internal' && (isAdmin || canManage(selected)) && <Button size="sm" variant="outline" onClick={() => void openEditProfile(selected)}>Sửa hồ sơ nhân viên</Button>}
          {isAdmin && selected.id !== user?.id && !selected.isProtected && <Button size="sm" variant="outline" onClick={() => openPasswordReset(selected)}>Đặt lại mật khẩu</Button>}
          {isAdmin && <Button size="sm" variant="outline" onClick={() => openHistory(selected.id)} startIcon={<Clock3 size={14} />}>Lịch sử thao tác</Button>}
        </div>
        {canManage(selected) && <div><h3 className="mb-2 font-semibold">Trạng thái</h3><div className="flex flex-wrap gap-2">
          {selected.status === 'Active' && <Button size="sm" variant="outline" onClick={() => queueStatus(selected, 'Khóa tài khoản', () => accountsApi.lock(selected.id, true), 'Các phiên đăng nhập hiện tại sẽ bị thu hồi.')}>Khóa</Button>}
          {selected.status === 'Locked' && <Button size="sm" variant="outline" onClick={() => queueStatus(selected, 'Mở khóa tài khoản', () => accountsApi.lock(selected.id, false), 'Người dùng cần đăng nhập lại.')}>Mở khóa</Button>}
          {selected.status !== 'Deactivated' ? <Button size="sm" variant="danger" onClick={() => queueStatus(selected, 'Vô hiệu hóa tài khoản', () => accountsApi.status(selected.id, 'Deactivated'), 'Các phiên đăng nhập hiện tại sẽ bị thu hồi.')}>Vô hiệu hóa</Button> : <Button size="sm" onClick={() => queueStatus(selected, 'Kích hoạt lại tài khoản', () => accountsApi.status(selected.id, 'Active'), 'Nếu email chưa xác thực, tài khoản sẽ trở về trạng thái chờ kích hoạt OTP.')}>Kích hoạt lại</Button>}
        </div></div>}
        {isAdmin && selected.accountType === 'Internal' && !selected.isProtected && <div><h3 className="mb-2 font-semibold">Vai trò</h3><div className="flex flex-wrap gap-3">{roleOptions.map(role => <label key={role} className="flex items-center gap-2"><input type="checkbox" checked={chosenRoles.includes(role)} onChange={e => setChosenRoles(current => e.target.checked ? [...current, role] : current.filter(item => item !== role))} />{role}</label>)}</div><Button className="mt-3" size="sm" disabled={!rolesChanged || chosenRoles.length === 0} onClick={() => queueStatus(selected, 'Đổi vai trò', () => accountsApi.roles(selected.id, chosenRoles), `Vai trò cũ: ${selected.roles.join(', ')} → vai trò mới: ${chosenRoles.join(', ')}. Các phiên đăng nhập sẽ bị thu hồi.`)}>Lưu vai trò</Button></div>}
      </div>}
    </Modal>
    <Modal open={!!editing} onClose={returnToDetail} title={editing?.kind === 'profile' ? 'Sửa hồ sơ nhân viên' : 'Sửa thông tin tài khoản'} description={editing?.account.fullName} loading={editLoading || editSubmitting} footer={<><Button variant="outline" onClick={returnToDetail} disabled={editSubmitting || editLoading}>Quay lại chi tiết</Button><Button type="submit" form="account-edit-form" loading={editSubmitting || editLoading}>Lưu thay đổi</Button></>}>
      {editing && <form id="account-edit-form" onSubmit={event => void saveEdit(event)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {editing.kind === 'account' ? <>
          <Input label="Họ tên" required value={editAccountForm.fullName} onChange={event => setEditAccountForm(current => ({ ...current, fullName: event.target.value }))} error={editErrors.fullName} />
          <Input label="Số điện thoại" required value={editAccountForm.phoneNumber} onChange={event => setEditAccountForm(current => ({ ...current, phoneNumber: event.target.value }))} error={editErrors.phoneNumber} />
          <Input label="Email" type="email" required disabled={editing.account.isProtected || editing.account.status === 'Locked' || editing.account.status === 'Deactivated'} value={editAccountForm.email} onChange={event => setEditAccountForm(current => ({ ...current, email: event.target.value }))} error={editErrors.email} />
          {editing.account.accountType === 'Internal' && <Input label="Username" required disabled={editing.account.isProtected} value={editAccountForm.username || ''} onChange={event => setEditAccountForm(current => ({ ...current, username: event.target.value }))} error={editErrors.username} />}
          {!editing.account.isProtected && <p className="sm:col-span-2 rounded-lg bg-state-info-soft p-3 text-xs text-state-info">Đổi email sẽ yêu cầu người dùng xác thực OTP bằng email mới. Đổi email hoặc username sẽ thu hồi các phiên đăng nhập. Tài khoản đang khóa hoặc vô hiệu hóa cần được mở lại trước khi đổi email.</p>}
        </> : <>
          <Input label="Họ tên" required value={editProfileForm.fullName} onChange={event => setEditProfileForm(current => ({ ...current, fullName: event.target.value }))} error={editErrors.fullName} />
          <Input label="Số điện thoại" required value={editProfileForm.phoneNumber} onChange={event => setEditProfileForm(current => ({ ...current, phoneNumber: event.target.value }))} error={editErrors.phoneNumber} />
          <Input label="Chức danh" required value={editProfileForm.jobTitle} onChange={event => setEditProfileForm(current => ({ ...current, jobTitle: event.target.value }))} error={editErrors.jobTitle} />
          <Input label="Ngày vào làm" type="date" required value={editProfileForm.hiredOn} onChange={event => setEditProfileForm(current => ({ ...current, hiredOn: event.target.value }))} error={editErrors.hiredOn} />
        </>}
        {editError && <p role="alert" className="sm:col-span-2 text-sm text-state-danger">{editError}</p>}
      </form>}
    </Modal>
    <Modal open={!!action} onClose={returnFromAction} title={`Xác nhận ${action?.label.toLowerCase() || 'thao tác'}`} description={action ? `${action.account.fullName} · ${action.account.email || action.account.phoneNumber}` : undefined} loading={submitting} footer={<><Button variant="outline" onClick={returnFromAction} disabled={submitting}>Quay lại chi tiết</Button><Button variant="danger" onClick={() => void runAction()} loading={submitting}>Xác nhận</Button></>}><p className="text-sm text-ink">{action?.impact}</p></Modal>
    <Modal open={!!resetTarget} onClose={closePasswordReset} title="Đặt lại mật khẩu" description={resetTarget ? `${resetTarget.fullName} · ${resetTarget.email || resetTarget.phoneNumber}` : undefined} loading={resetSubmitting} footer={resetConfirming ? <><Button variant="outline" onClick={() => setResetConfirming(false)} disabled={resetSubmitting}>Quay lại</Button><Button variant="danger" type="submit" form="password-reset-form" loading={resetSubmitting}>Đặt lại mật khẩu</Button></> : <><Button variant="outline" onClick={closePasswordReset}>Quay lại chi tiết</Button><Button type="submit" form="password-reset-form">Tiếp tục</Button></>}>
      {resetTarget && <form id="password-reset-form" onSubmit={event => void submitPasswordReset(event)} className="space-y-4">
        {resetConfirming ? <div className="space-y-3 rounded-xl bg-state-warning-soft p-4 text-sm text-state-warning-strong"><p>Bạn sắp đặt lại mật khẩu cho <strong>{resetTarget.fullName}</strong>.</p><p>Mọi phiên đăng nhập của tài khoản sẽ bị thu hồi. Mật khẩu sẽ không được hiển thị lại sau khi hoàn tất.</p><p>{resetUseDefault ? 'Mật khẩu mặc định sẽ là Ocs@123456.' : 'Tài khoản sẽ dùng mật khẩu tự chọn vừa nhập.'}</p></div> : <>
          {resetTarget.accountType === 'Internal' ? <div role="radiogroup" aria-label="Mật khẩu mới" className="grid gap-2 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${resetUseDefault ? 'border-brand-pink bg-brand-pink-surface text-brand-ink' : 'border-border text-muted'}`}><input type="radio" name="reset-password-mode" checked={resetUseDefault} onChange={() => { setResetUseDefault(true); setResetPassword(''); setResetError(null); }} className="mt-0.5 accent-brand-highlight" /><span><strong className="block">Mật khẩu mặc định</strong><span className="text-xs">Ocs@123456</span></span></label>
            <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${!resetUseDefault ? 'border-brand-pink bg-brand-pink-surface text-brand-ink' : 'border-border text-muted'}`}><input type="radio" name="reset-password-mode" checked={!resetUseDefault} onChange={() => { setResetUseDefault(false); setResetPassword(''); setResetError(null); }} className="mt-0.5 accent-brand-highlight" /><span><strong className="block">Mật khẩu tự chọn</strong><span className="text-xs">Đặt mật khẩu mới</span></span></label>
          </div> : <p className="rounded-lg bg-brand-pink-surface p-3 text-sm text-brand-ink">Customer cần được đặt mật khẩu tự chọn.</p>}
          {(!resetUseDefault || resetTarget.accountType === 'Customer') && <Input label="Mật khẩu mới" type={resetPasswordVisible ? 'text' : 'password'} autoComplete="new-password" required value={resetPassword} onChange={event => { setResetPassword(event.target.value); setResetError(null); }} error={resetError} helperText="8–70 ký tự, chữ hoa, chữ thường, số hoặc ký tự đặc biệt; tối đa 72 byte." endAdornment={<button type="button" aria-label={resetPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={resetPasswordVisible} onClick={() => setResetPasswordVisible(value => !value)} className="rounded p-1 text-muted hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-pink-focus">{resetPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />}
        </>}
        {resetError && resetConfirming && <p role="alert" className="text-sm text-state-danger">{resetError}</p>}
      </form>}
    </Modal>
    <Modal open={historyOpen} onClose={closeHistory} title="Lịch sử thao tác tài khoản" description={historyAccountId ? `Lịch sử cho ${historyReturnAccount?.fullName || 'tài khoản đã chọn'}` : 'Các thay đổi được ghi nhận trong hệ thống.'} className="!max-w-[90vw]" footer={<div className="flex w-full items-center justify-between"><span className="text-sm text-muted">{historyData?.totalCount ?? 0} sự kiện</span><div className="flex items-center gap-3"><Pagination page={historyPage} totalPages={historyData?.totalPages ?? 0} onPageChange={setHistoryPage} /><Button variant="outline" onClick={closeHistory}>{historyReturnAccount ? 'Quay lại chi tiết' : 'Đóng'}</Button></div></div>}>
      {historyError ? <ErrorState title="Không thể tải lịch sử" description={historyError} onRetry={() => { setHistoryData(null); setHistoryRefreshKey(value => value + 1); }} /> : historyLoading ? <Loading label="Đang tải lịch sử..." className="py-10" /> : !historyData?.items.length ? <EmptyState title="Chưa có lịch sử thao tác" description="Các thay đổi đã được ghi nhận sẽ xuất hiện ở đây." /> : <div className="max-h-[65vh] overflow-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="sticky top-0 bg-brand-pink-surface text-xs uppercase tracking-wide text-muted"><tr>{['Thời điểm', 'Người thực hiện', 'Thao tác', 'Loại dữ liệu', 'Nguồn', 'Thay đổi'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{historyData.items.map((item: AccountHistoryItem) => <tr key={item.id} className="align-top"><td className="whitespace-nowrap px-3 py-3">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.occurredAt))}</td><td className="max-w-36 break-all px-3 py-3 text-xs">{item.actorAccountId}</td><td className="px-3 py-3 font-semibold">{item.action}</td><td className="px-3 py-3">{item.entityType}</td><td className="px-3 py-3">{item.source}</td><td className="max-w-sm px-3 py-3"><pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface p-2 text-xs">{JSON.stringify(item.changes ?? {}, null, 2)}</pre></td></tr>)}</tbody></table></div>}
    </Modal>
  </div>;
}
