import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Banknote, Check, CheckCircle2, Clock3, FileCheck2, RefreshCw, Search, Send, Wallet, X } from 'lucide-react';
import { settlementsApi, type Payout, type PayoutHistory, type SettlementContract, type SettlementLine, type SettlementPreview } from '@/api/settlements';
import { parseProblemDetails } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { AlertBanner, Badge, Button, Card, Combobox, Input, Modal, PageHeaderCard, Pagination, Skeleton, SkeletonLoading, Table, TableDetailButton, type BadgeVariant, type TableColumn } from '@/components/shared';
import { DecimalMoneyInput, parseDecimalMoney, toDecimalMoneyInput } from '@/components/shop/ContractMoneyInput';

const PAGE_SIZE = 10;
const money = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value) + ' ₫';
const dateOnly = (value?: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';

const stateLabel: Record<Payout['status'], string> = {
  Pending: 'Chờ duyệt chi',
  Approved: 'Đã duyệt · chờ chuyển khoản',
  Transferred: 'Đã chuyển · chờ xác nhận',
  Completed: 'Đã hoàn tất',
  Rejected: 'Đã từ chối',
};
const stateVariant: Record<Payout['status'], BadgeVariant> = {
  Pending: 'warning', Approved: 'info', Transferred: 'payment', Completed: 'success', Rejected: 'danger',
};
const contractStatusLabel: Record<string, string> = {
  Active: 'Đang hiệu lực', Completed: 'Đã hoàn tất', Cancelled: 'Đã hủy',
};
const contractStatusVariant: Record<string, BadgeVariant> = {
  Active: 'success', Completed: 'info', Cancelled: 'danger',
};
const lineLabel: Record<string, string> = {
  SaleProceeds: 'Doanh thu bán', Commission: 'Hoa hồng', Compensation: 'Bồi thường', ServiceFee: 'Phí dịch vụ',
};
const auditLabel: Record<string, string> = {
  status: 'Trạng thái', totalAmount: 'Tổng chi', approvedAt: 'Thời điểm duyệt',
  bankCode: 'Ngân hàng', bankAccountNumber: 'Số tài khoản', bankAccountHolder: 'Chủ tài khoản',
  proofUrl: 'Chứng từ', bankTransactionReference: 'Mã giao dịch', rejectedAt: 'Thời điểm từ chối',
  rejectionReason: 'Lý do từ chối', completedAt: 'Thời điểm hoàn tất',
};
const auditActionLabel: Record<string, string> = {
  PayoutCreated: 'Lập lệnh chi', PayoutUpdated: 'Cập nhật lệnh chi',
  UpdatePayment: 'Đổi tài khoản nhận', UpdateServiceFee: 'Điều chỉnh phí dịch vụ',
};
const fileClass = 'mt-1.5 block w-full rounded-control border border-border bg-paper px-3 py-2 text-xs text-ink file:mr-3 file:rounded-control file:border-0 file:bg-brand-pink-surface file:px-3 file:py-1.5 file:font-semibold file:text-brand-ink';
const textareaClass = 'mt-1.5 w-full rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight';
const errorText = (error: unknown) => {
  const problem = parseProblemDetails(error);
  return problem.detail || problem.title || 'Không thể tải hoặc lưu quyết toán.';
};

const sumLines = (lines: SettlementLine[], type: SettlementLine['type']) =>
  lines.filter(line => line.type === type).reduce((total, line) => total + line.amount, 0);

const resolveEligibilityKind = (c: SettlementContract) => {
  if (c.eligibilityKind) return c.eligibilityKind;
  if (c.contractStatus === 'Cancelled') return 'Cancelled';
  if (c.openPayoutId) return 'OpenPayout';
  if (c.blockReason) return 'Blocked';
  if ((c.eligiblePayoutAmount ?? 0) > 0) return (c.activeProductCount ?? 0) > 0 ? 'ReadyInterim' : 'ReadyFinal';
  return 'SettledOrEmpty';
};

const contractSortRank = (c: SettlementContract) => {
  const kind = resolveEligibilityKind(c);
  if (kind === 'ReadyFinal' || kind === 'ReadyInterim') return 0;
  if (kind === 'OpenPayout') return 1;
  const hasWaitingAmount = (c.unsettledSalesNetAmount ?? 0) > 0 || (c.unsettledCompensationAmount ?? 0) > 0;
  if (kind === 'Blocked' && hasWaitingAmount) return 2;
  if (kind === 'Blocked') return 3;
  return 4;
};

const eligibilityBadge = (kind: string): { label: string; variant: BadgeVariant } => {
  switch (kind) {
    case 'ReadyFinal': return { label: 'Sẵn sàng quyết toán', variant: 'success' };
    case 'ReadyInterim': return { label: 'Sẵn sàng chi bồi thường', variant: 'info' };
    case 'OpenPayout': return { label: 'Đang có lệnh chi mở', variant: 'warning' };
    case 'Blocked': return { label: 'Chưa đủ ĐK lập', variant: 'neutral' };
    case 'Cancelled': return { label: 'Đã hủy', variant: 'danger' };
    default: return { label: 'Không phát sinh chi (0 ₫)', variant: 'neutral' };
  }
};

const resolveEligibilityFactors = (item: {
  eligibilityFactors?: string[];
  endsAt?: string | null;
  productCount?: number;
  totalProductCount?: number;
  soldProductCount?: number;
  activeProductCount?: number;
  openPayoutNumber?: string | null;
  eligibilityReason?: string | null;
}) => {
  if (item.eligibilityFactors && item.eligibilityFactors.length > 0) return item.eligibilityFactors;
  const factors: string[] = [];
  if (item.endsAt) {
    const expired = new Date(item.endsAt).getTime() <= Date.now();
    factors.push(`${expired ? 'Đã hết hạn' : 'Còn hạn'} (${dateOnly(item.endsAt)})`);
  }
  const total = item.productCount ?? item.totalProductCount ?? 0;
  const sold = item.soldProductCount ?? 0;
  const active = item.activeProductCount ?? 0;
  if (total > 0) {
    if (active === 0 && sold === total) factors.push(`Đã bán xong (${sold}/${total} SP)`);
    else if (active === 0) factors.push(`Đã xử lý xong (${total}/${total} SP)`);
    else factors.push(`Còn ${active}/${total} SP đang bán`);
  }
  if (item.openPayoutNumber) factors.push(`Lệnh chi mở: ${item.openPayoutNumber}`);
  else if (item.eligibilityReason) factors.push(item.eligibilityReason);
  return factors;
};

function PayoutProof({ payoutId, uploadedUrl }: { payoutId?: string; uploadedUrl?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let objectUrl = '';
    let active = true;
    const load = payoutId ? settlementsApi.readProof(payoutId) : uploadedUrl ? settlementsApi.readUploadedProof(uploadedUrl) : Promise.reject(new Error('Missing proof'));
    void load.then(blob => { objectUrl = URL.createObjectURL(blob); if (active) setSrc(objectUrl); }).catch(() => setSrc(''));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [payoutId, uploadedUrl]);
  return src
    ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt="Chứng từ giải ngân" className="max-h-64 rounded-card border border-border object-contain" /></a>
    : <span className="text-xs text-muted">Đang tải chứng từ…</span>;
}

function SettlementLines({ lines, emptyText = 'Chưa có khoản tiền đủ điều kiện quyết toán.' }: { lines: SettlementLine[]; emptyText?: string }) {
  const columns: TableColumn<SettlementLine>[] = [
    {
      key: 'type',
      header: 'Khoản mục',
      render: line => <Badge variant={line.type === 'Compensation' ? 'info' : line.amount < 0 ? 'warning' : 'success'}>{lineLabel[line.type] ?? line.type}</Badge>,
    },
    { key: 'description', header: 'Chi tiết phát sinh', render: line => <span className="text-ink">{line.description}</span> },
    {
      key: 'amount',
      header: 'Số tiền',
      headerClassName: 'text-right',
      cellClassName: 'text-right whitespace-nowrap',
      render: line => <strong className={line.amount < 0 ? 'text-state-danger' : 'text-brand-ink'}>{money(line.amount)}</strong>,
    },
  ];
  return (
    <Table
      className="!bg-white [&_th]:!px-3 [&_td]:!px-3"
      columns={columns}
      data={lines}
      rowKey={(line, index) => line.type + (line.productId ?? line.incidentReportId ?? index)}
      emptyTitle={emptyText}
      emptyMessage=""
    />
  );
}

function SettlementSummary({ lines, enteredFee }: { lines: SettlementLine[]; enteredFee?: number | null }) {
  const figures = [
    ['Doanh thu bán', sumLines(lines, 'SaleProceeds')],
    ['Hoa hồng cửa hàng', sumLines(lines, 'Commission')],
    ['Bồi thường sự cố', sumLines(lines, 'Compensation')],
    ['Phí dịch vụ', enteredFee === undefined ? sumLines(lines, 'ServiceFee') : enteredFee === null ? null : -enteredFee],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {figures.map(([label, amount]) => (
        <div key={label} className="rounded-card border border-border bg-surface-subtle p-3">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-1 font-bold tabular-nums text-ink">{amount === null ? 'Chưa nhập' : money(amount)}</p>
        </div>
      ))}
    </div>
  );
}

function HistoryChanges({ changes }: { changes: string }) {
  let fields: Record<string, { old?: unknown; new?: unknown }> = {};
  try { fields = JSON.parse(changes) as typeof fields; } catch { /* Older audit records can have another shape. */ }
  const names = Object.keys(fields).filter(key => key in auditLabel);
  return names.length > 0 ? (
    <ul className="mt-1 space-y-0.5 text-muted">
      {names.map(key => <li key={key}>{auditLabel[key]}: {String(fields[key]?.old ?? '—')} → {String(fields[key]?.new ?? '—')}</li>)}
    </ul>
  ) : null;
}

type Action = 'details' | 'approve' | 'payment' | 'fee' | 'reject' | 'transfer';

export function SettlementManagement() {
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = hasPermission('settlements.manage');
  const linkedPayoutId = searchParams.get('payout');
  const [contracts, setContracts] = useState<SettlementContract[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [selected, setSelected] = useState<Payout | null>(null);
  const [history, setHistory] = useState<PayoutHistory[]>([]);
  const [view, setView] = useState<'contracts' | 'payouts'>(linkedPayoutId ? 'payouts' : 'contracts');
  const [contractQuery, setContractQuery] = useState('');
  const [contractFilter, setContractFilter] = useState('all');
  const [contractPage, setContractPage] = useState(1);
  const [payoutQuery, setPayoutQuery] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [payoutPage, setPayoutPage] = useState(1);
  const [action, setAction] = useState<Action>('details');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fee, setFee] = useState('');
  const [feeDescription, setFeeDescription] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [proof, setProof] = useState('');
  const [reference, setReference] = useState('');

  const load = useCallback(async () => {
    try {
      const [contractRows, payoutRows] = await Promise.all([settlementsApi.contracts(), settlementsApi.payouts()]);
      setContracts(contractRows); setPayouts(payoutRows);
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const openPreview = async (contractId: string) => {
    setBusy(true); setError('');
    try { setPreview(await settlementsApi.preview(contractId)); setFee(''); setFeeDescription(''); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const openPayout = useCallback(async (id: string) => {
    setBusy(true); setError(''); setHistory([]); setAction('details');
    try {
      const [payout, events] = await Promise.all([settlementsApi.payout(id), settlementsApi.history(id)]);
      setSelected(payout); setHistory(events); setBankCode(payout.bankCode ?? '');
      setBankNumber(payout.bankAccountNumber ?? ''); setBankHolder(payout.bankAccountHolder ?? '');
      const feeLine = payout.lines.find(line => line.type === 'ServiceFee');
      setFee(feeLine && feeLine.amount < 0 ? toDecimalMoneyInput(-feeLine.amount) : ''); setFeeDescription(feeLine?.description ?? '');
      setChangeReason(''); setRejectReason(''); setProof(''); setReference('');
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => {
    if (!linkedPayoutId) return;
    setView('payouts');
    void openPayout(linkedPayoutId);
  }, [linkedPayoutId, openPayout]);

  const closeSelectedPayout = () => {
    setSelected(null);
    setError('');
    if (linkedPayoutId) {
      setSearchParams(current => {
        const next = new URLSearchParams(current);
        next.delete('payout');
        return next;
      });
    }
  };

  const refreshPayout = async (id: string, message: string) => {
    await load(); await openPayout(id); setNotice(message);
  };
  const createPayout = async () => {
    if (!preview || busy) return;
    const parsed = fee ? parseDecimalMoney(fee) : 0;
    if (parsed === null || parsed < 0 || (parsed > 0 && !feeDescription.trim())) {
      setError('Nhập phí dịch vụ không âm và mô tả khi có thu phí.');
      return;
    }
    setBusy(true); setError('');
    try {
      const payout = await settlementsApi.create(preview.contractId, parsed, feeDescription.trim());
      setPreview(null); setView('payouts'); setPayoutStatusFilter('Pending');
      await refreshPayout(payout.id, 'Đã lập lệnh chi. Kiểm tra tài khoản nhận và bảng kê trước khi duyệt.');
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const runAction = async (operation: () => Promise<Payout>, message: string) => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try { const updated = await operation(); await refreshPayout(updated.id, message); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const uploadProof = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try { const response = await settlementsApi.uploadProof(file); setProof(response.url); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const submitPayment = (event: FormEvent) => {
    event.preventDefault(); if (selected) void runAction(
      () => settlementsApi.updatePayment(selected.id, bankCode, bankNumber, bankHolder, changeReason),
      'Đã cập nhật tài khoản nhận và lưu lịch sử thay đổi.');
  };
  const submitReject = (event: FormEvent) => {
    event.preventDefault(); if (selected) void runAction(() => settlementsApi.reject(selected.id, rejectReason), 'Đã từ chối lệnh chi. Các khoản trong bảng kê có thể được lập lại.');
  };
  const submitFee = (event: FormEvent) => {
    event.preventDefault();
    const amount = fee ? parseDecimalMoney(fee) : 0;
    if (!selected || amount === null || amount < 0 || (amount > 0 && !feeDescription.trim())) {
      setError('Phí dịch vụ hoặc mô tả không hợp lệ.');
      return;
    }
    void runAction(() => settlementsApi.updateServiceFee(selected.id, amount, feeDescription.trim(), changeReason), 'Đã cập nhật phí dịch vụ trong bảng kê.');
  };
  const submitTransfer = (event: FormEvent) => {
    event.preventDefault(); if (selected) void runAction(() => settlementsApi.transfer(selected.id, proof, reference), 'Đã lưu giao dịch và chứng từ giải ngân.');
  };

  const feeAmount = fee ? (parseDecimalMoney(fee) ?? 0) : 0;
  const netAmount = preview ? preview.totalAmount - feeAmount : 0;

  const summaryStats = useMemo(() => {
    const readyContracts = contracts.filter(c => !c.blockReason && (c.eligiblePayoutAmount ?? 0) > 0);
    const waitingContracts = contracts.filter(c => Boolean(c.blockReason) && ((c.unsettledSalesNetAmount ?? 0) > 0 || (c.unsettledCompensationAmount ?? 0) > 0));
    const settledEmptyCount = contracts.filter(c => resolveEligibilityKind(c) === 'SettledOrEmpty').length;
    const openPayoutContracts = contracts.filter(c => Boolean(c.openPayoutId));

    const pendingPayouts = payouts.filter(p => p.status === 'Pending');
    const approvedPayouts = payouts.filter(p => p.status === 'Approved');
    const transferredPayouts = payouts.filter(p => p.status === 'Transferred');
    const completedPayouts = payouts.filter(p => p.status === 'Completed');
    const rejectedPayouts = payouts.filter(p => p.status === 'Rejected');
    const activePayouts = [...pendingPayouts, ...approvedPayouts, ...transferredPayouts];

    const readySales = readyContracts.reduce((s, c) => s + (resolveEligibilityKind(c) === 'ReadyFinal' ? (c.unsettledSalesNetAmount ?? 0) : 0), 0);
    const readyComp = readyContracts.reduce((s, c) => s + (c.unsettledCompensationAmount ?? 0), 0);

    return {
      readyCount: readyContracts.length,
      readyAmount: readyContracts.reduce((s, c) => s + (c.eligiblePayoutAmount ?? 0), 0),
      readySales,
      readyComp,
      waitingCount: waitingContracts.length,
      waitingSalesAmount: waitingContracts.reduce((s, c) => s + (c.unsettledSalesNetAmount ?? 0), 0),
      waitingCompAmount: waitingContracts.reduce((s, c) => s + (c.unsettledCompensationAmount ?? 0), 0),
      openPayoutContractsCount: openPayoutContracts.length,
      settledEmptyCount,
      activePayoutCount: activePayouts.length,
      activePayoutAmount: activePayouts.reduce((s, p) => s + p.totalAmount, 0),
      pendingCount: pendingPayouts.length,
      pendingAmount: pendingPayouts.reduce((s, p) => s + p.totalAmount, 0),
      approvedCount: approvedPayouts.length,
      approvedAmount: approvedPayouts.reduce((s, p) => s + p.totalAmount, 0),
      transferredCount: transferredPayouts.length,
      transferredAmount: transferredPayouts.reduce((s, p) => s + p.totalAmount, 0),
      completedCount: completedPayouts.length,
      completedAmount: completedPayouts.reduce((s, p) => s + p.totalAmount, 0),
      rejectedCount: rejectedPayouts.length,
      rejectedAmount: rejectedPayouts.reduce((s, p) => s + p.totalAmount, 0),
      allPayoutAmount: payouts.reduce((s, p) => s + p.totalAmount, 0),
    };
  }, [contracts, payouts]);

  const sortedContracts = useMemo(() =>
    [...contracts].sort((a, b) => contractSortRank(a) - contractSortRank(b)),
  [contracts]);

  const filteredContracts = useMemo(() => {
    const q = contractQuery.trim().toLocaleLowerCase('vi-VN');
    return sortedContracts.filter(contract => {
      if (q) {
        const hay = `${contract.contractNumber} ${contract.customerName ?? ''} ${contract.customerPhone ?? ''} ${contract.openPayoutNumber ?? ''}`.toLocaleLowerCase('vi-VN');
        if (!hay.includes(q)) return false;
      }
      const kind = resolveEligibilityKind(contract);
      if (contractFilter === 'ready') return kind === 'ReadyFinal' || kind === 'ReadyInterim';
      if (contractFilter === 'openPayout') return Boolean(contract.openPayoutId);
      if (contractFilter === 'waiting') return Boolean(contract.blockReason) && ((contract.unsettledSalesNetAmount ?? 0) > 0 || (contract.unsettledCompensationAmount ?? 0) > 0);
      if (contractFilter === 'empty') return kind === 'SettledOrEmpty' || kind === 'Cancelled';
      return true;
    });
  }, [sortedContracts, contractQuery, contractFilter]);

  const contractTotalPages = Math.max(1, Math.ceil(filteredContracts.length / PAGE_SIZE));
  useEffect(() => { setContractPage(1); }, [contractQuery, contractFilter]);
  useEffect(() => { if (contractPage > contractTotalPages) setContractPage(contractTotalPages); }, [contractPage, contractTotalPages]);
  const pagedContracts = filteredContracts.slice((contractPage - 1) * PAGE_SIZE, contractPage * PAGE_SIZE);

  const filteredPayouts = useMemo(() => {
    const q = payoutQuery.trim().toLocaleLowerCase('vi-VN');
    return payouts.filter(payout => {
      if (payoutStatusFilter === 'active') {
        if (payout.status !== 'Pending' && payout.status !== 'Approved' && payout.status !== 'Transferred') return false;
      } else if (payoutStatusFilter === 'inFlight') {
        if (payout.status !== 'Approved' && payout.status !== 'Transferred') return false;
      } else if (payoutStatusFilter !== 'all' && payout.status !== payoutStatusFilter) {
        return false;
      }
      if (q) {
        const hay = `${payout.payoutNumber} ${payout.contractNumber} ${payout.customerName ?? ''} ${payout.customerPhone ?? ''}`.toLocaleLowerCase('vi-VN');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [payouts, payoutQuery, payoutStatusFilter]);

  const payoutTotalPages = Math.max(1, Math.ceil(filteredPayouts.length / PAGE_SIZE));
  useEffect(() => { setPayoutPage(1); }, [payoutQuery, payoutStatusFilter]);
  useEffect(() => { if (payoutPage > payoutTotalPages) setPayoutPage(payoutTotalPages); }, [payoutPage, payoutTotalPages]);
  const pagedPayouts = filteredPayouts.slice((payoutPage - 1) * PAGE_SIZE, payoutPage * PAGE_SIZE);

  const contractTotals = useMemo(() => ({
    eligible: filteredContracts.reduce((s, c) => s + (c.eligiblePayoutAmount ?? 0), 0),
    waitingSales: filteredContracts.reduce((s, c) => s + (resolveEligibilityKind(c) === 'ReadyFinal' ? 0 : (c.unsettledSalesNetAmount ?? 0)), 0),
    waitingComp: filteredContracts.reduce((s, c) => s + (c.unsettledCompensationAmount ?? 0), 0),
    openPayout: filteredContracts.reduce((s, c) => s + (c.openPayoutAmount ?? 0), 0),
    completedAmount: filteredContracts.reduce((s, c) => s + (c.completedPayoutAmount ?? 0), 0),
  }), [filteredContracts]);

  const payoutTotals = useMemo(() => {
    let sales = 0; let comp = 0; let serviceFee = 0; let legacy = 0; let net = 0;
    for (const p of filteredPayouts) {
      if (p.lines.length === 0) {
        legacy += p.totalAmount;
      } else {
        sales += sumLines(p.lines, 'SaleProceeds') + sumLines(p.lines, 'Commission');
        comp += sumLines(p.lines, 'Compensation');
        serviceFee += sumLines(p.lines, 'ServiceFee');
      }
      net += p.totalAmount;
    }
    return { sales, comp, serviceFee, legacy, net };
  }, [filteredPayouts]);

  const contractColumns: TableColumn<SettlementContract>[] = [
    {
      key: 'contract',
      header: 'Hợp đồng',
      render: c => {
        const expired = c.endsAt ? new Date(c.endsAt).getTime() <= Date.now() : false;
        return (
          <div>
            <p className="font-bold text-brand-highlight">{c.contractNumber}</p>
            <p className="mt-0.5 text-xs text-muted">
              Hết hạn: {dateOnly(c.endsAt)} · <span className={expired ? 'font-semibold text-state-danger' : 'text-text-secondary'}>{expired ? 'Đã hết hạn' : 'Còn hạn'}</span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={contractStatusVariant[c.contractStatus] ?? 'neutral'}>{contractStatusLabel[c.contractStatus] ?? c.contractStatus}</Badge>
              {(c.completedPayoutCount ?? 0) > 0 && (
                <span className="text-[11px] font-medium text-muted">Đã chi {money(c.completedPayoutAmount ?? 0)} ({c.completedPayoutCount})</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Khách hàng & TK nhận',
      render: c => (
        <div>
          <p className="font-semibold text-ink">{c.customerName || 'Khách ký gửi'}</p>
          <p className="text-xs text-muted">{c.customerPhone || '—'}</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {c.bankCode && c.bankAccountNumber ? `${c.bankCode} · ${c.bankAccountNumber}` : <span className="text-state-warning-strong">Chưa đủ thông tin TK</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'products',
      header: 'Tiến độ sản phẩm',
      render: c => (
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-ink">{c.soldProductCount}/{c.productCount} đã bán</p>
          {(c.compensatedProductCount ?? 0) > 0 && <p className="text-brand-highlight">{c.compensatedProductCount} bồi thường sự cố</p>}
          {(c.activeProductCount ?? 0) > 0
            ? <p className="text-muted">{c.activeProductCount} đang bán / chờ xử lý</p>
            : <p className="text-state-success-strong">{c.productCount > 0 ? '0 đang bán (đã xử lý hết)' : 'Chưa có sản phẩm'}</p>}
        </div>
      ),
    },
    {
      key: 'amounts',
      header: 'Khoản chờ tất toán',
      headerClassName: 'text-right',
      cellClassName: 'text-right whitespace-nowrap',
      render: c => {
        const kind = resolveEligibilityKind(c);
        const eligible = c.eligiblePayoutAmount ?? 0;
        const sales = c.unsettledSalesNetAmount ?? 0;
        const comp = c.unsettledCompensationAmount ?? 0;
        if (eligible === 0 && sales === 0 && comp === 0) {
          return <span className="text-xs text-muted">0 ₫</span>;
        }
        return (
          <div className="space-y-0.5 text-xs tabular-nums">
            {eligible > 0 && (
              <p className="font-bold text-state-success-strong">Đủ ĐK: {money(eligible)}</p>
            )}
            {sales > 0 && kind !== 'ReadyFinal' && (
              <p className="text-text-secondary">Chờ cuối đợt: <strong className="text-ink">{money(sales)}</strong></p>
            )}
            {comp > 0 && kind !== 'ReadyInterim' && kind !== 'ReadyFinal' && (
              <p className="text-brand-highlight">BT chưa lập chi: <strong>{money(comp)}</strong></p>
            )}
          </div>
        );
      },
    },
    {
      key: 'eligibility',
      header: 'Điều kiện quyết toán',
      render: c => {
        const kind = resolveEligibilityKind(c);
        const badge = eligibilityBadge(kind);
        const factors = resolveEligibilityFactors(c);
        return (
          <div className="space-y-1">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <ul className="space-y-0.5 text-xs text-text-secondary">
              {factors.map(factor => (
                <li key={factor} className="flex items-start gap-1.5">
                  <span aria-hidden="true" className="text-muted">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
            {c.openPayoutId && c.openPayoutNumber && (
              <button
                type="button"
                onClick={event => { event.stopPropagation(); setView('payouts'); void openPayout(c.openPayoutId!); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink hover:underline"
              >
                Mở {c.openPayoutNumber} · {money(c.openPayoutAmount ?? 0)} <ArrowRight size={12} />
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'action',
      header: 'Thao tác',
      render: c => {
        const kind = resolveEligibilityKind(c);
        if (kind === 'ReadyFinal' || kind === 'ReadyInterim') {
          return (
            <Button size="sm" disabled={busy} onClick={event => { event.stopPropagation(); void openPreview(c.contractId); }}>
              Lập lệnh chi
            </Button>
          );
        }
        if (c.openPayoutId) {
          return (
            <Button size="sm" variant="outline" disabled={busy} onClick={event => { event.stopPropagation(); setView('payouts'); void openPayout(c.openPayoutId!); }}>
              Xử lý lệnh chi
            </Button>
          );
        }
        return (
          <Button size="sm" variant="ghost" disabled={busy} onClick={event => { event.stopPropagation(); void openPreview(c.contractId); }}>
            Xem bảng kê
          </Button>
        );
      },
    },
  ];

  const payoutColumns: TableColumn<Payout>[] = [
    {
      key: 'payoutNumber',
      header: 'Mã lệnh chi',
      render: p => {
        const hasSales = p.lines.some(l => l.type === 'SaleProceeds');
        const hasComp = p.lines.some(l => l.type === 'Compensation');
        const scopeLabel = p.lines.length === 0 ? 'Khoản gộp (dữ liệu mẫu)' : hasComp && !hasSales ? 'Bồi thường sự cố' : hasComp && hasSales ? 'Tổng hợp đợt & sự cố' : 'Quyết toán cuối đợt';
        return (
          <div>
            <p className="font-bold text-brand-highlight">{p.payoutNumber}</p>
            <p className="mt-0.5 text-xs text-muted">{dateTime(p.createdAt)}</p>
            <p className="mt-0.5 text-[11px] font-medium text-text-secondary">{scopeLabel}</p>
          </div>
        );
      },
    },
    {
      key: 'contract',
      header: 'Hợp đồng & Khách hàng',
      render: p => (
        <div>
          <p className="font-semibold text-ink">{p.contractNumber}</p>
          <p className="text-xs text-muted">{p.customerName || 'Khách ký gửi'} · {p.customerPhone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'bank',
      header: 'Tài khoản nhận',
      render: p => p.bankCode && p.bankAccountNumber
        ? (
          <div className="text-xs">
            <p className="font-semibold text-ink">{p.bankCode} · {p.bankAccountNumber}</p>
            <p className="text-muted">{p.bankAccountHolder || '—'}</p>
          </div>
        )
        : <Badge variant="warning">Chưa có tài khoản</Badge>,
    },
    {
      key: 'breakdown',
      header: 'Cấu phần bảng kê',
      render: p => {
        if (p.lines.length === 0) {
          return <span className="text-xs text-muted">Khoản gộp {money(p.totalAmount)} · chưa tách dòng</span>;
        }
        const salesNet = sumLines(p.lines, 'SaleProceeds') + sumLines(p.lines, 'Commission');
        const comp = sumLines(p.lines, 'Compensation');
        const serviceFee = sumLines(p.lines, 'ServiceFee');
        return (
          <div className="space-y-0.5 text-xs tabular-nums">
            {salesNet !== 0 && <p className="text-ink">Doanh thu ròng: <strong>{money(salesNet)}</strong></p>}
            {comp > 0 && <p className="text-brand-highlight">Bồi thường: <strong>{money(comp)}</strong></p>}
            {serviceFee !== 0 && <p className="text-state-danger">Phí DV: <strong>{money(serviceFee)}</strong></p>}
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      header: 'Tổng thực chi',
      headerClassName: 'text-right',
      cellClassName: 'text-right whitespace-nowrap',
      render: p => <strong className="text-sm tabular-nums text-brand-ink">{money(p.totalAmount)}</strong>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: p => <Badge variant={stateVariant[p.status]}>{stateLabel[p.status]}</Badge>,
    },
    {
      key: 'action',
      header: 'Thao tác',
      render: p => <TableDetailButton onClick={() => void openPayout(p.id)} />,
    },
  ];

  const previewKind = preview ? (preview.eligibilityKind ?? (preview.blockReason ? 'Blocked' : preview.lines.length > 0 ? (preview.isCompensationOnly ? 'ReadyInterim' : 'ReadyFinal') : 'SettledOrEmpty')) : null;
  const previewShowsSameLinesAsDeferred = Boolean(preview && preview.isMidTerm && !preview.isCompensationOnly && preview.deferredLines && preview.deferredLines.length > 0 && preview.lines.every(l => l.type !== 'Compensation'));

  return (
    <section className="space-y-5" aria-labelledby="settlements-heading">
      <PageHeaderCard
        icon={<Banknote size={24} />}
        title="Quyết toán & giải ngân"
        titleId="settlements-heading"
        description="Thống kê nguồn tiền hợp đồng, giải thích điều kiện lập quyết toán, duyệt lệnh chi và lưu chứng từ chuyển khoản."
        actions={<Button variant="outline" onClick={() => void load()} startIcon={<RefreshCw size={16} />}>Làm mới</Button>}
      />
      {notice && <AlertBanner variant="success" message={notice} onClose={() => setNotice('')} />}
      {error && !preview && !selected && <AlertBanner variant="error" message={error} />}

      {/* Bảng thống kê 4 chỉ số tài chính & tiến độ lệnh chi */}
      <div className="space-y-3" aria-busy={loading}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => { setView('contracts'); setContractFilter('ready'); }}
            className="text-left group"
          >
            <Card className={`h-full !bg-white !p-4 transition ${view === 'contracts' && contractFilter === 'ready' ? 'border-brand-highlight ring-1 ring-brand-highlight/30' : 'hover:border-brand-highlight'}`}>
              {loading ? <><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-6 w-24" /></> : <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-text-secondary">Sẵn sàng lập lệnh chi</p>
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-state-success-soft text-state-success"><CheckCircle2 size={15} /></span>
                </div>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-brand-ink">{money(summaryStats.readyAmount)}</p>
                <p className="mt-0.5 text-[11px] font-medium text-ink tabular-nums">{summaryStats.readyCount} hợp đồng đủ điều kiện</p>
                <p className="mt-0.5 text-[11px] text-muted tabular-nums">Bán: {money(summaryStats.readySales)} · BT: {money(summaryStats.readyComp)}</p>
              </>}
            </Card>
          </button>

          <button
            type="button"
            onClick={() => { setView('contracts'); setContractFilter('waiting'); }}
            className="text-left group"
          >
            <Card className={`h-full !bg-white !p-4 transition ${view === 'contracts' && contractFilter === 'waiting' ? 'border-brand-highlight ring-1 ring-brand-highlight/30' : 'hover:border-brand-highlight'}`}>
              {loading ? <><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-6 w-24" /></> : <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-text-secondary">Khoản chờ đủ điều kiện</p>
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-state-info-soft text-state-info"><Clock3 size={15} /></span>
                </div>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-ink">{money(summaryStats.waitingSalesAmount + summaryStats.waitingCompAmount)}</p>
                <p className="mt-0.5 text-[11px] font-medium text-ink tabular-nums">{summaryStats.waitingCount} hợp đồng đang chờ cuối đợt</p>
                <p className="mt-0.5 text-[11px] text-muted tabular-nums">Bán: {money(summaryStats.waitingSalesAmount)} · BT: {money(summaryStats.waitingCompAmount)}</p>
              </>}
            </Card>
          </button>

          <button
            type="button"
            onClick={() => { setView('payouts'); setPayoutStatusFilter('active'); }}
            className="text-left group"
          >
            <Card className={`h-full !bg-white !p-4 transition ${view === 'payouts' && (payoutStatusFilter === 'active' || payoutStatusFilter === 'Pending' || payoutStatusFilter === 'inFlight') ? 'border-brand-highlight ring-1 ring-brand-highlight/30' : 'hover:border-brand-highlight'}`}>
              {loading ? <><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-6 w-24" /></> : <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-text-secondary">Lệnh chi đang xử lý</p>
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-state-warning-soft text-state-warning"><Wallet size={15} /></span>
                </div>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-state-warning-strong">{money(summaryStats.activePayoutAmount)}</p>
                <p className="mt-0.5 text-[11px] font-medium text-ink tabular-nums">{summaryStats.activePayoutCount} lệnh chi chưa hoàn tất</p>
                <p className="mt-0.5 text-[11px] text-muted tabular-nums">Chờ duyệt: {summaryStats.pendingCount} · Chờ chuyển/XN: {summaryStats.approvedCount + summaryStats.transferredCount}</p>
              </>}
            </Card>
          </button>

          <button
            type="button"
            onClick={() => { setView('payouts'); setPayoutStatusFilter('Completed'); }}
            className="text-left group"
          >
            <Card className={`h-full !bg-white !p-4 transition ${view === 'payouts' && payoutStatusFilter === 'Completed' ? 'border-brand-highlight ring-1 ring-brand-highlight/30' : 'hover:border-brand-highlight'}`}>
              {loading ? <><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-6 w-24" /></> : <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-text-secondary">Đã hoàn tất giải ngân</p>
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-pink-light text-brand-highlight"><Banknote size={15} /></span>
                </div>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-state-success-strong">{money(summaryStats.completedAmount)}</p>
                <p className="mt-0.5 text-[11px] font-medium text-ink tabular-nums">{summaryStats.completedCount} lệnh chi đã thanh toán</p>
                <p className="mt-0.5 text-[11px] text-muted tabular-nums">{summaryStats.settledEmptyCount} HĐ không phát sinh dư nợ (0 ₫)</p>
              </>}
            </Card>
          </button>
        </div>

        {/* Dải thống kê vòng đời lệnh chi */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-white px-4 py-2.5 text-xs">
            <span className="font-semibold text-text-secondary">Thống kê lệnh chi ({payouts.length}):</span>
            {[
              { id: 'all', label: 'Tất cả', count: payouts.length, amount: summaryStats.allPayoutAmount },
              { id: 'Pending', label: 'Chờ duyệt', count: summaryStats.pendingCount, amount: summaryStats.pendingAmount },
              { id: 'Approved', label: 'Đã duyệt · chờ chuyển', count: summaryStats.approvedCount, amount: summaryStats.approvedAmount },
              { id: 'Transferred', label: 'Đã chuyển · chờ XN', count: summaryStats.transferredCount, amount: summaryStats.transferredAmount },
              { id: 'Completed', label: 'Hoàn tất', count: summaryStats.completedCount, amount: summaryStats.completedAmount },
              ...(summaryStats.rejectedCount > 0 ? [{ id: 'Rejected', label: 'Từ chối', count: summaryStats.rejectedCount, amount: summaryStats.rejectedAmount }] : []),
            ].map(pill => {
              const active = view === 'payouts' && payoutStatusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => { setView('payouts'); setPayoutStatusFilter(pill.id); }}
                  className={'rounded-full border px-3 py-1 transition tabular-nums ' + (active ? 'border-brand-pink bg-brand-pink-surface font-bold text-brand-ink' : 'border-border bg-surface-subtle text-text-secondary hover:border-brand-highlight hover:text-ink')}
                >
                  {pill.label}: <strong>{pill.count}</strong> ({money(pill.amount)})
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Card
        title={view === 'contracts' ? 'Hợp đồng & điều kiện quyết toán' : 'Danh sách lệnh chi'}
        description={view === 'contracts'
          ? 'Hợp đồng cần xử lý được đưa lên đầu bảng; mỗi dòng nêu rõ lý do đủ hay chưa đủ điều kiện lập lệnh chi.'
          : 'Xem cấu phần bảng kê, sửa tài khoản/phí dịch vụ (khi chờ duyệt), duyệt lệnh chi và lưu chứng từ chuyển khoản.'}
      >
        <div className="mb-4 flex flex-wrap gap-1 border-b border-border" role="tablist" aria-label="Chức năng quyết toán">
          <button type="button" role="tab" aria-selected={view === 'contracts'} onClick={() => setView('contracts')} className={'border-b-2 px-4 py-3 text-sm font-semibold ' + (view === 'contracts' ? 'border-brand-pink text-brand-ink' : 'border-transparent text-muted hover:text-brand-highlight')}>
            Hợp đồng & lập quyết toán ({contracts.length})
          </button>
          <button type="button" role="tab" aria-selected={view === 'payouts'} onClick={() => setView('payouts')} className={'border-b-2 px-4 py-3 text-sm font-semibold ' + (view === 'payouts' ? 'border-brand-pink text-brand-ink' : 'border-transparent text-muted hover:text-brand-highlight')}>
            Danh sách lệnh chi ({payouts.length})
          </button>
        </div>

        {view === 'contracts' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: 'all', label: `Tất cả (${contracts.length})` },
                { value: 'ready', label: `Sẵn sàng lập (${summaryStats.readyCount})` },
                { value: 'openPayout', label: `Đang có lệnh chi (${summaryStats.openPayoutContractsCount})` },
                { value: 'waiting', label: `Có tiền chờ cuối đợt (${summaryStats.waitingCount})` },
                { value: 'empty', label: `0 ₫ / Đã xong (${summaryStats.settledEmptyCount})` },
              ].map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setContractFilter(tab.value)}
                  className={'rounded-full border px-3 py-1 text-xs transition ' + (contractFilter === tab.value ? 'border-brand-pink bg-brand-pink-surface font-bold text-brand-ink' : 'border-border bg-white text-text-secondary hover:border-brand-highlight')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_250px]">
              <Input aria-label="Tìm hợp đồng quyết toán" placeholder="Tìm mã hợp đồng, khách hàng, SĐT, mã lệnh chi…" value={contractQuery} onChange={e => setContractQuery(e.target.value)} startAdornment={<Search size={17} />} />
              <Combobox
                ariaLabel="Lọc hợp đồng"
                value={contractFilter}
                onChange={setContractFilter}
                options={[
                  { value: 'all', label: 'Tất cả hợp đồng (ưu tiên cần xử lý)' },
                  { value: 'ready', label: 'Sẵn sàng lập lệnh chi' },
                  { value: 'openPayout', label: 'Đang có lệnh chi mở' },
                  { value: 'waiting', label: 'Có doanh thu/BT chờ cuối đợt' },
                  { value: 'empty', label: 'Không phát sinh chi (0 ₫)' },
                ]}
              />
            </div>

            {loading ? <SkeletonLoading variant="table" columns={6} count={4} label="Đang tải hợp đồng quyết toán..." /> : (
              <>
                <Table
                  className="!bg-white"
                  columns={contractColumns}
                  data={pagedContracts}
                  rowKey="contractId"
                  onRowClick={c => void openPreview(c.contractId)}
                  emptyTitle="Không có hợp đồng phù hợp"
                  emptyMessage="Thử chọn bộ lọc khác hoặc xóa từ khóa tìm kiếm."
                />
                {contractTotalPages > 1 && <Pagination page={contractPage} totalPages={contractTotalPages} onPageChange={setContractPage} aria-label="Phân trang hợp đồng quyết toán" />}
                {filteredContracts.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 rounded-card border border-border bg-surface-subtle p-3.5 text-xs sm:grid-cols-5">
                    <div><span className="text-muted">Hợp đồng đang lọc</span><p className="mt-0.5 font-bold tabular-nums text-ink">{filteredContracts.length} HĐ</p></div>
                    <div><span className="text-muted">Đủ ĐK lập ngay</span><p className="mt-0.5 font-bold tabular-nums text-state-success-strong">{money(contractTotals.eligible)}</p></div>
                    <div><span className="text-muted">Doanh thu chờ cuối đợt</span><p className="mt-0.5 font-bold tabular-nums text-ink">{money(contractTotals.waitingSales)}</p></div>
                    <div><span className="text-muted">Đang nằm trong lệnh mở</span><p className="mt-0.5 font-bold tabular-nums text-brand-highlight">{money(contractTotals.openPayout)}</p></div>
                    <div><span className="text-muted">Đã hoàn tất trước đó</span><p className="mt-0.5 font-bold tabular-nums text-brand-ink">{money(contractTotals.completedAmount)}</p></div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_250px]">
              <Input aria-label="Tìm lệnh chi" placeholder="Mã lệnh chi, hợp đồng, khách hàng, SĐT…" value={payoutQuery} onChange={e => setPayoutQuery(e.target.value)} startAdornment={<Search size={17} />} />
              <Combobox
                ariaLabel="Trạng thái lệnh chi"
                value={payoutStatusFilter}
                onChange={setPayoutStatusFilter}
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'active', label: 'Tất cả lệnh đang xử lý' },
                  { value: 'Pending', label: 'Chờ duyệt chi' },
                  { value: 'inFlight', label: 'Chờ chuyển / Chờ khách XN' },
                  { value: 'Approved', label: 'Đã duyệt · chờ chuyển' },
                  { value: 'Transferred', label: 'Đã chuyển · chờ XN' },
                  { value: 'Completed', label: 'Đã hoàn tất' },
                  { value: 'Rejected', label: 'Đã từ chối' },
                ]}
              />
            </div>
            {loading ? <SkeletonLoading variant="table" columns={7} count={4} label="Đang tải danh sách lệnh chi..." /> : (
              <>
                <Table
                  className="!bg-white"
                  columns={payoutColumns}
                  data={pagedPayouts}
                  rowKey="id"
                  selectedRowKey={selected?.id ?? null}
                  onRowClick={p => void openPayout(p.id)}
                  emptyTitle="Chưa có lệnh chi phù hợp"
                  emptyMessage="Lệnh chi sẽ xuất hiện tại đây sau khi duyệt bồi thường sự cố hoặc lập quyết toán hợp đồng."
                />
                {payoutTotalPages > 1 && <Pagination page={payoutPage} totalPages={payoutTotalPages} onPageChange={setPayoutPage} aria-label="Phân trang lệnh chi" />}
                {filteredPayouts.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 rounded-card border border-border bg-surface-subtle p-3.5 text-xs sm:grid-cols-6">
                    <div><span className="text-muted">Số lệnh chi</span><p className="mt-0.5 font-bold tabular-nums text-ink">{filteredPayouts.length}</p></div>
                    <div><span className="text-muted">Doanh thu ròng</span><p className="mt-0.5 font-bold tabular-nums text-ink">{money(payoutTotals.sales)}</p></div>
                    <div><span className="text-muted">Bồi thường sự cố</span><p className="mt-0.5 font-bold tabular-nums text-brand-highlight">{money(payoutTotals.comp)}</p></div>
                    <div><span className="text-muted">Chưa tách dòng</span><p className="mt-0.5 font-bold tabular-nums text-text-secondary">{money(payoutTotals.legacy)}</p></div>
                    <div><span className="text-muted">Phí dịch vụ</span><p className="mt-0.5 font-bold tabular-nums text-state-danger">{money(payoutTotals.serviceFee)}</p></div>
                    <div><span className="text-muted">Tổng thực chi</span><p className="mt-0.5 font-bold tabular-nums text-brand-ink">{money(payoutTotals.net)}</p></div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={!!preview}
        onClose={() => { setPreview(null); setError(''); }}
        title="Bảng kê quyết toán"
        description={preview ? preview.contractNumber + ' · ' + (preview.customerName || 'Khách ký gửi') : undefined}
        error={error || undefined}
        disabled={busy}
        className="!w-[calc(100vw-2rem)] !max-w-3xl !rounded-card [&>header]:!rounded-t-card"
      >
        {preview && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-card border border-border bg-surface-subtle p-4 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <p><strong className="text-ink">Hợp đồng:</strong> {preview.contractNumber}</p>
                <p><strong className="text-ink">Khách ký gửi:</strong> {preview.customerName || 'Khách ký gửi'} ({preview.customerPhone || '—'})</p>
                <p><strong className="text-ink">Hết hạn hợp đồng:</strong> {dateOnly(preview.endsAt)}</p>
              </div>
              <div className="space-y-1">
                <p><strong className="text-ink">Ngân hàng nhận:</strong> {preview.bankCode || 'Chưa có'}</p>
                <p><strong className="text-ink">Số tài khoản:</strong> {preview.bankAccountNumber || 'Chưa có'}</p>
                <p><strong className="text-ink">Chủ tài khoản:</strong> {preview.bankAccountHolder || 'Chưa có'}</p>
              </div>
            </div>

            {/* Thống kê sản phẩm & lịch sử lệnh chi của hợp đồng */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                ['Tổng sản phẩm', preview.totalProductCount ?? 0],
                ['Đã bán', preview.soldProductCount ?? 0],
                ['Bồi thường sự cố', preview.compensatedProductCount ?? 0],
                ['Đang bán / xử lý', preview.activeProductCount ?? 0],
                ['Đã chi trước đó', `${preview.completedPayoutCount ?? 0} (${money(preview.completedPayoutAmount ?? 0)})`],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-card border border-border bg-white p-2.5 text-xs">
                  <p className="text-muted">{label}</p>
                  <p className="mt-0.5 font-bold tabular-nums text-ink">{val}</p>
                </div>
              ))}
            </div>

            {preview.openPayoutId && preview.openPayoutStatus && (
              <AlertBanner
                variant="info"
                message={
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Hợp đồng đang có lệnh chi <strong>{preview.openPayoutNumber}</strong> ({stateLabel[preview.openPayoutStatus]} · {money(preview.openPayoutAmount ?? 0)}).
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const payoutId = preview.openPayoutId!;
                        setPreview(null);
                        setView('payouts');
                        void openPayout(payoutId);
                      }}
                      endIcon={<ArrowRight size={14} />}
                    >
                      Mở lệnh chi ngay
                    </Button>
                  </div>
                }
              />
            )}

            <AlertBanner
              variant={previewKind === 'ReadyFinal' || previewKind === 'ReadyInterim' ? 'success' : 'warning'}
              icon={previewKind === 'ReadyFinal' || previewKind === 'ReadyInterim' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
              title={preview.eligibilityReason || 'Điều kiện quyết toán'}
              message={
                <ul className="mt-1 space-y-0.5 text-xs">
                  {resolveEligibilityFactors(preview).map(factor => (
                    <li key={factor} className="flex items-start gap-1.5">
                      <span aria-hidden="true">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              }
            />

            {previewShowsSameLinesAsDeferred ? (
              <div className="space-y-2 rounded-card border border-dashed border-border bg-surface-subtle p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                  <span>Doanh thu bán hàng đã thu tiền (chờ đủ điều kiện cuối đợt để lập chi)</span>
                  <span className="tabular-nums text-ink">{money(preview.deferredAmount ?? preview.totalAmount)}</span>
                </div>
                <SettlementLines lines={preview.deferredLines ?? preview.lines} />
              </div>
            ) : (
              <>
                <SettlementSummary lines={preview.lines} enteredFee={preview.blockReason ? undefined : feeAmount} />
                <SettlementLines
                  lines={preview.lines}
                  emptyText={preview.openPayoutId ? 'Các khoản hiện tại đã được đưa vào lệnh chi đang mở.' : 'Chưa có khoản tiền đủ điều kiện quyết toán.'}
                />
                {preview.deferredLines && preview.deferredLines.length > 0 && (
                  <div className="space-y-2 rounded-card border border-dashed border-border bg-surface-subtle p-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                      <span>Doanh thu bán hàng chờ quyết toán cuối đợt</span>
                      <span className="tabular-nums text-ink">{money(preview.deferredAmount ?? 0)}</span>
                    </div>
                    <SettlementLines lines={preview.deferredLines} />
                  </div>
                )}
              </>
            )}

            {canManage && !preview.blockReason && preview.lines.length > 0 && (
              <div className="space-y-3 rounded-card border border-border bg-surface-subtle p-4">
                <DecimalMoneyInput
                  label="Phí dịch vụ do quản lý nhập (₫)"
                  value={fee}
                  onChange={setFee}
                  placeholder="0"
                  helperText="Tự động thêm dấu chấm ngăn cách; để trống hoặc nhập 0 nếu không thu phí."
                />
                <Input label="Mô tả phí dịch vụ" value={feeDescription} onChange={event => setFeeDescription(event.target.value)} maxLength={1000} required={feeAmount > 0} placeholder="Nội dung và cơ sở thu phí" />
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 font-bold text-ink">
              <span>{preview.blockReason ? 'Tổng khoản đang ghi nhận / chờ cuối đợt' : 'Thực trả dự kiến'}</span>
              <span className="tabular-nums">{money(preview.blockReason ? preview.totalAmount : netAmount)}</span>
            </div>
            {canManage && !preview.blockReason && preview.lines.length > 0 && (
              <Button
                className="w-full"
                loading={busy}
                disabled={netAmount <= 0 || (feeAmount > 0 && !feeDescription.trim())}
                onClick={() => void createPayout()}
              >
                Lập lệnh chi
              </Button>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!selected}
        onClose={closeSelectedPayout}
        title="Chi tiết lệnh chi"
        description={selected ? selected.payoutNumber + ' · ' + selected.contractNumber : undefined}
        error={error || undefined}
        disabled={busy}
        className="!w-[calc(100vw-2rem)] !max-w-3xl !rounded-card [&>header]:!rounded-t-card"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted">{selected.customerName || 'Khách ký gửi'} · Lập {dateTime(selected.createdAt)}</span>
              <Badge variant={stateVariant[selected.status]}>{stateLabel[selected.status]}</Badge>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1 rounded-card border border-border bg-surface-subtle p-4 text-sm text-ink">
                <h3 className="mb-2 font-bold">Tài khoản nhận</h3>
                <p>Ngân hàng: {selected.bankCode || 'Chưa có'}</p>
                <p>Số tài khoản: {selected.bankAccountNumber || 'Chưa có'}</p>
                <p>Chủ tài khoản: {selected.bankAccountHolder || 'Chưa có'}</p>
              </div>
              <div className="space-y-1 rounded-card border border-border bg-surface-subtle p-4 text-sm text-ink">
                <h3 className="mb-2 font-bold">Phê duyệt & giải ngân</h3>
                <p>Người duyệt: {selected.approvedByName || '—'}</p>
                <p>Duyệt lúc: {dateTime(selected.approvedAt)}</p>
                <p>Chuyển lúc: {dateTime(selected.transferredAt)}</p>
                <p>Mã giao dịch: {selected.bankTransactionReference || '—'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-ink">Bảng kê đã lưu</h3>
              {selected.lines.length === 0 ? (
                <AlertBanner variant="info" message={`Lệnh chi dữ liệu mẫu chưa có dòng chi tiết tách riêng (tổng thực chi: ${money(selected.totalAmount)}).`} />
              ) : (
                <>
                  <SettlementSummary lines={selected.lines} />
                  <SettlementLines lines={selected.lines} />
                </>
              )}
              <div className="mt-3 flex justify-between font-bold text-ink"><span>Thực trả</span><span className="tabular-nums">{money(selected.totalAmount)}</span></div>
            </div>
            {selected.rejectionReason && <AlertBanner variant="warning" message={'Từ chối bởi ' + (selected.rejectedByName || 'quản lý') + ' lúc ' + dateTime(selected.rejectedAt) + ': ' + selected.rejectionReason} />}
            {selected.proofUrl && <div><h3 className="mb-2 text-sm font-bold text-ink">Chứng từ giải ngân</h3><PayoutProof payoutId={selected.id} /></div>}
            {selected.status === 'Transferred' && (
              <AlertBanner
                variant="info"
                icon={<FileCheck2 size={17} />}
                message={
                  selected.autoConfirmAt
                    ? `Đang chờ khách xác nhận; tự động hoàn tất lúc ${dateTime(selected.autoConfirmAt)} nếu không có khiếu nại đang mở.`
                    : 'Đang chờ khách xác nhận; tự động hoàn tất theo thời hạn cấu hình nếu không có khiếu nại đang mở.'
                }
              />
            )}
            {selected.status === 'Completed' && (
              <AlertBanner
                variant="success"
                message={
                  selected.customerConfirmedAt
                    ? `Khách đã xác nhận nhận tiền lúc ${dateTime(selected.customerConfirmedAt)}.`
                    : `Tự động hoàn tất lúc ${dateTime(selected.completedAt)}.`
                }
              />
            )}
            {canManage && selected.status === 'Pending' && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={() => setAction('fee')}>Sửa phí dịch vụ</Button>
                <Button variant="outline" onClick={() => setAction('payment')}>Sửa tài khoản nhận</Button>
                <Button onClick={() => setAction('approve')} startIcon={<Check size={16} />}>Duyệt lệnh chi</Button>
                <Button variant="danger" onClick={() => setAction('reject')} startIcon={<X size={16} />}>Từ chối</Button>
              </div>
            )}
            {canManage && selected.status === 'Approved' && <Button onClick={() => setAction('transfer')} startIcon={<Send size={16} />}>Ghi nhận giải ngân</Button>}
            {action === 'approve' && selected.status === 'Pending' && (
              <div className="space-y-3 rounded-card border border-border bg-brand-pink-surface p-4">
                <p className="text-sm text-ink">Xác nhận duyệt lệnh chi {money(selected.totalAmount)} tới {selected.bankAccountNumber || 'tài khoản chưa nhập'}? Sau khi duyệt, bảng kê và tài khoản nhận sẽ được khóa.</p>
                {(!selected.bankCode || !selected.bankAccountNumber || !selected.bankAccountHolder) && (
                  <AlertBanner variant="warning" message="Cần cập nhật đủ thông tin tài khoản nhận trước khi duyệt lệnh chi." />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAction('details')}>Quay lại</Button>
                  <Button
                    disabled={!selected.bankCode || !selected.bankAccountNumber || !selected.bankAccountHolder}
                    loading={busy}
                    onClick={() => void runAction(
                      () => settlementsApi.approve(selected.id),
                      selected.lines.some(line => line.type === 'Compensation')
                        ? 'Đã duyệt lệnh chi và cập nhật trạng thái bồi thường sự cố sang Đã bồi thường.'
                        : 'Đã duyệt lệnh chi.',
                    )}
                  >
                    Xác nhận duyệt
                  </Button>
                </div>
              </div>
            )}
            {action === 'payment' && selected.status === 'Pending' && (
              <form onSubmit={submitPayment} className="space-y-3 rounded-card border border-border bg-brand-pink-surface p-4">
                <h3 className="font-bold text-ink">Cập nhật tài khoản nhận</h3>
                <Input label="Ngân hàng" value={bankCode} onChange={event => setBankCode(event.target.value)} maxLength={50} required />
                <Input label="Số tài khoản" value={bankNumber} onChange={event => setBankNumber(event.target.value)} maxLength={50} required />
                <Input label="Chủ tài khoản" value={bankHolder} onChange={event => setBankHolder(event.target.value)} maxLength={200} required />
                <Input label="Lý do cập nhật" value={changeReason} onChange={event => setChangeReason(event.target.value)} maxLength={1000} required />
                <div className="flex gap-2"><Button variant="outline" onClick={() => setAction('details')}>Hủy</Button><Button type="submit" loading={busy}>Lưu tài khoản</Button></div>
              </form>
            )}
            {action === 'fee' && selected.status === 'Pending' && (
              <form onSubmit={submitFee} className="space-y-3 rounded-card border border-border bg-brand-pink-surface p-4">
                <h3 className="font-bold text-ink">Cập nhật phí dịch vụ</h3>
                <DecimalMoneyInput
                  label="Phí dịch vụ (₫)"
                  value={fee}
                  onChange={setFee}
                  placeholder="0"
                  helperText="Tự động thêm dấu chấm ngăn cách; để trống hoặc nhập 0 nếu không thu phí."
                />
                <Input label="Mô tả phí" value={feeDescription} onChange={event => setFeeDescription(event.target.value)} maxLength={1000} required={feeAmount > 0} />
                <Input label="Lý do cập nhật" value={changeReason} onChange={event => setChangeReason(event.target.value)} maxLength={1000} required />
                <div className="flex gap-2"><Button variant="outline" onClick={() => setAction('details')}>Hủy</Button><Button type="submit" loading={busy}>Lưu phí</Button></div>
              </form>
            )}
            {action === 'reject' && selected.status === 'Pending' && (
              <form onSubmit={submitReject} className="space-y-3 rounded-card border border-border bg-brand-pink-surface p-4">
                <label className="block text-xs font-bold uppercase tracking-wide text-ink">Lý do từ chối<textarea className={textareaClass} value={rejectReason} onChange={event => setRejectReason(event.target.value)} maxLength={1000} rows={3} required /></label>
                <div className="flex gap-2"><Button variant="outline" onClick={() => setAction('details')}>Hủy</Button><Button type="submit" variant="danger" loading={busy}>Xác nhận từ chối</Button></div>
              </form>
            )}
            {action === 'transfer' && selected.status === 'Approved' && (
              <form onSubmit={submitTransfer} className="space-y-3 rounded-card border border-border bg-brand-pink-surface p-4">
                <h3 className="font-bold text-ink">Ghi nhận chuyển khoản</h3>
                <label className="block text-xs font-bold uppercase tracking-wide text-ink">Ảnh ủy nhiệm chi / biên lai<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProof} className={fileClass} /></label>
                {proof && <PayoutProof uploadedUrl={proof} />}
                <Input label="Mã giao dịch ngân hàng" value={reference} onChange={event => setReference(event.target.value)} maxLength={100} required />
                <div className="flex gap-2"><Button variant="outline" onClick={() => setAction('details')}>Hủy</Button><Button type="submit" disabled={!proof} loading={busy}>Lưu chứng từ và chuyển khoản</Button></div>
              </form>
            )}
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-bold text-ink">Lịch sử thao tác</h3>
              {history.length === 0 ? <p className="text-sm text-muted">Chưa có bản ghi lịch sử.</p> : (
                <ol className="space-y-2">
                  {history.map((event, index) => (
                    <li key={event.occurredAt + index} className="rounded-card border border-border bg-surface-subtle p-3 text-xs text-ink">
                      <strong>{auditActionLabel[event.action] ?? event.action}</strong> · {dateTime(event.occurredAt)}
                      {event.actorName && <span className="block text-muted">Người thao tác: {event.actorName}</span>}
                      {event.reason && <span className="block text-muted">Lý do: {event.reason}</span>}
                      <HistoryChanges changes={event.changes} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
