import { CheckCircle2, Clock3, MapPinOff, Package, AlertTriangle } from "lucide-react";
import type { InventorySummary } from "@/api/inventory";
import { ShopSummaryStrip, type ShopSummaryCard } from "../ShopSummaryStrip";

export type InventoryQuickFilter =
  | "all"
  | "pendingProcessing"
  | "unassigned"
  | "onSale"
  | "expired";

interface InventorySummaryStripProps {
  summary: InventorySummary | null;
  loading: boolean;
  activeQuickFilter: InventoryQuickFilter | null;
  onSelectQuickFilter: (filter: InventoryQuickFilter) => void;
}

export function InventorySummaryStrip({ summary, loading, activeQuickFilter, onSelectQuickFilter }: InventorySummaryStripProps) {
  const cards: ShopSummaryCard<InventoryQuickFilter>[] = [
    {
      id: "all",
      label: "Tổng trong kho",
      value: summary?.totalCount,
      hint: "Tất cả sản phẩm",
      icon: Package,
      tone: "bg-brand-pink-light text-brand-highlight",
    },
    {
      id: "pendingProcessing",
      label: "Chờ xử lý",
      value: summary?.pendingProcessingCount,
      hint: "Xếp vị trí và đưa lên bán",
      icon: Clock3,
      tone: "bg-state-warning-soft text-state-warning",
    },
    {
      id: "unassigned",
      label: "Chưa xếp vị trí",
      value: summary?.unassignedLocationCount,
      hint: `${summary?.readyToOfferCount ?? 0} món chờ mở bán`,
      icon: MapPinOff,
      tone: "bg-state-info-soft text-state-info",
    },
    {
      id: "onSale",
      label: "Đang bán",
      value: summary?.onSaleCount,
      hint: "Sẵn sàng tại quầy POS",
      icon: CheckCircle2,
      tone: "bg-state-success-soft text-state-success",
    },
    {
      id: "expired",
      label: "Hết hạn",
      value: summary?.expiredCount,
      hint: "Cần trả khách / quyên góp",
      icon: AlertTriangle,
      tone: "bg-state-danger-soft text-state-danger",
    },
  ];
  return <ShopSummaryStrip cards={cards} loading={loading} activeQuickFilter={activeQuickFilter} onSelectQuickFilter={onSelectQuickFilter} ariaLabel="Thống kê nhanh kho hàng" loadingLabel="Đang tải thống kê kho hàng…" />;
}
