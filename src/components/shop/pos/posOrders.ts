import type { PosProductLookupDto } from '@/api/pos';

export const MAX_HELD_ORDERS = 4;
export const POS_ORDERS_STORAGE_KEY = 'ocs_pos_orders_v1';
export const LEGACY_POS_CART_KEY = 'ocs_pos_cart';

export type PosPaymentMethod = 'cash' | 'vietqr';

export interface PosOrderTab {
  id: string;
  label: string;
  items: PosProductLookupDto[];
  paymentMethod: PosPaymentMethod;
  cashGiven: number;
  createdAt: number;
}

export interface PosOrdersState {
  orders: PosOrderTab[];
  activeOrderId: string;
  nextSequence: number;
}

export function createEmptyOrderTab(sequence: number): PosOrderTab {
  return {
    id: `order-${sequence}-${Date.now()}`,
    label: `Đơn #${sequence}`,
    items: [],
    paymentMethod: 'cash',
    cashGiven: 0,
    createdAt: Date.now(),
  };
}

export function normalizeOrderTabs(orders: PosOrderTab[]): {
  orders: PosOrderTab[];
  nextSequence: number;
} {
  const normalized = orders.map((order, idx) => ({
    ...order,
    label: `Đơn #${idx + 1}`,
  }));
  return {
    orders: normalized,
    nextSequence: normalized.length + 1,
  };
}

export function loadInitialOrdersState(): PosOrdersState {
  try {
    const raw = localStorage.getItem(POS_ORDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PosOrdersState>;
      if (Array.isArray(parsed.orders) && parsed.orders.length > 0) {
        const validOrders = parsed.orders.slice(0, MAX_HELD_ORDERS).map((order, idx) => ({
          id: typeof order.id === 'string' && order.id ? order.id : `order-${idx + 1}`,
          label: `Đơn #${idx + 1}`,
          items: Array.isArray(order.items) ? order.items : [],
          paymentMethod: (order.paymentMethod === 'vietqr' ? 'vietqr' : 'cash') as PosPaymentMethod,
          cashGiven: typeof order.cashGiven === 'number' && Number.isFinite(order.cashGiven) ? order.cashGiven : 0,
          createdAt: typeof order.createdAt === 'number' ? order.createdAt : Date.now(),
        }));
        const activeId = validOrders.some((o) => o.id === parsed.activeOrderId)
          ? (parsed.activeOrderId as string)
          : validOrders[0].id;
        return { orders: validOrders, activeOrderId: activeId, nextSequence: validOrders.length + 1 };
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_POS_CART_KEY);
    if (legacyRaw) {
      const legacyItems = JSON.parse(legacyRaw);
      if (Array.isArray(legacyItems) && legacyItems.length > 0) {
        const firstOrder = { ...createEmptyOrderTab(1), items: legacyItems };
        return { orders: [firstOrder], activeOrderId: firstOrder.id, nextSequence: 2 };
      }
    }
  } catch {
    // ignore storage parse issues
  }

  const first = createEmptyOrderTab(1);
  return { orders: [first], activeOrderId: first.id, nextSequence: 2 };
}

export function persistOrdersState(state: PosOrdersState): void {
  try {
    localStorage.setItem(POS_ORDERS_STORAGE_KEY, JSON.stringify(state));
    const activeOrder = state.orders.find((o) => o.id === state.activeOrderId) ?? state.orders[0];
    if (activeOrder && activeOrder.items.length > 0) {
      localStorage.setItem(LEGACY_POS_CART_KEY, JSON.stringify(activeOrder.items));
    } else {
      localStorage.removeItem(LEGACY_POS_CART_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function addHeldOrderTab(state: PosOrdersState): PosOrdersState {
  if (state.orders.length >= MAX_HELD_ORDERS) {
    return state;
  }
  const sequence = state.orders.length + 1;
  const newOrder = createEmptyOrderTab(sequence);
  const { orders, nextSequence } = normalizeOrderTabs([...state.orders, newOrder]);
  return {
    orders,
    activeOrderId: newOrder.id,
    nextSequence,
  };
}

export function removeHeldOrderTab(state: PosOrdersState, targetId: string): PosOrdersState {
  if (state.orders.length <= 1) {
    const resetOrder = {
      ...state.orders[0],
      label: 'Đơn #1',
      items: [],
      cashGiven: 0,
      paymentMethod: 'cash' as const,
    };
    return {
      orders: [resetOrder],
      activeOrderId: resetOrder.id,
      nextSequence: 2,
    };
  }

  const index = state.orders.findIndex((o) => o.id === targetId);
  if (index === -1) return state;

  const filtered = state.orders.filter((o) => o.id !== targetId);
  const { orders, nextSequence } = normalizeOrderTabs(filtered);
  const nextActiveId =
    state.activeOrderId === targetId
      ? orders[Math.max(0, index - 1)].id
      : state.activeOrderId;

  return {
    orders,
    activeOrderId: nextActiveId,
    nextSequence,
  };
}

/**
 * Checks whether a unique consignment product (SL: 1) is already reserved in another held order tab.
 */
export function findOtherOrderHoldingProduct(
  orders: PosOrderTab[],
  activeOrderId: string,
  productId: string,
  barcode?: string | null,
): PosOrderTab | undefined {
  return orders.find(
    (order) =>
      order.id !== activeOrderId &&
      order.items.some(
        (item) => item.id === productId || (Boolean(barcode) && item.barcode === barcode),
      ),
  );
}

export function buildQuickCashSuggestions(totalAmount: number): number[] {
  if (totalAmount <= 0) return [];

  const suggestions: number[] = [];
  const pushUnique = (val: number) => {
    if (val > totalAmount && !suggestions.includes(val)) {
      suggestions.push(val);
    }
  };

  for (const step of [50_000, 100_000, 500_000, 1_000_000]) {
    pushUnique(Math.ceil(totalAmount / step) * step);
  }

  const fallbackStep = totalAmount >= 1_000_000 ? 500_000 : 50_000;
  let cursor = suggestions[suggestions.length - 1] ?? Math.ceil(totalAmount / fallbackStep) * fallbackStep;
  if (cursor <= totalAmount) cursor += fallbackStep;
  pushUnique(cursor);

  while (suggestions.length < 3) {
    cursor += fallbackStep;
    pushUnique(cursor);
  }

  return suggestions.slice(0, 3);
}
