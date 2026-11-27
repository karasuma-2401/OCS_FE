export type ShopNavId =
  | 'pos'
  | 'inventory'
  | 'expiry'
  | 'withdrawals'
  | 'buyout'
  | 'consignment'
  | 'customers'
  | 'incidents'
  | 'settlement'
  | 'reports'
  | 'settings'
  | 'accounts';

export const screenPermissions: Record<ShopNavId, string> = {
  pos: 'screens.pos',
  inventory: 'screens.inventory',
  expiry: 'expiry.read',
  withdrawals: 'withdrawals.read',
  buyout: 'products.read',
  consignment: 'screens.consignment',
  customers: 'screens.customers',
  incidents: 'incidents.read',
  settlement: 'settlements.read',
  reports: 'screens.reports',
  settings: 'screens.settings',
  accounts: 'screens.accounts',
};

export const screenPaths: Record<ShopNavId, string> = {
  pos: '/shop/pos',
  inventory: '/shop/inventory',
  expiry: '/shop/expiry',
  withdrawals: '/shop/withdrawals',
  buyout: '/shop/buyouts',
  consignment: '/shop/consignment',
  customers: '/shop/customers',
  incidents: '/shop/incidents',
  settlement: '/shop/settlement',
  reports: '/shop/reports',
  settings: '/shop/settings',
  accounts: '/admin/accounts',
};

export const screenByPath: Record<string, ShopNavId> = {
  ...Object.fromEntries(Object.entries(screenPaths).map(([screen, path]) => [path, screen as ShopNavId])),
  '/admin': 'reports',
  '/admin/pos': 'pos',
  '/admin/products': 'inventory',
  '/shop/inventory/expiry': 'expiry',
  '/shop/incidents/new': 'incidents',
  '/admin/buyouts': 'buyout',
  '/admin/withdrawals': 'withdrawals',
  '/admin/contracts': 'consignment',
  '/admin/customers': 'customers',
  '/admin/settlement': 'settlement',
  '/admin/reports': 'reports',
  '/admin/settings': 'settings',
  '/shop/accounts': 'accounts',
};

export const screenOrder: ShopNavId[] = [
  'reports', 'pos', 'inventory', 'expiry', 'withdrawals', 'buyout', 'consignment', 'customers', 'incidents',
  'settlement', 'accounts', 'settings',
];

export const screenRequirements: Partial<Record<ShopNavId, string>> = {
  accounts: 'accounts.read',
  consignment: 'appointments.staff.read',
  reports: 'reports.read',
  settings: 'permissions.manage',
};

export function canAccessScreen(permissions: readonly string[], id: ShopNavId) {
  const available = new Set(permissions);
  const required = screenRequirements[id];
  return available.has(screenPermissions[id]) && (!required || available.has(required));
}

export function firstAllowedScreen(permissions: readonly string[]) {
  const screen = screenOrder.find(id => canAccessScreen(permissions, id));
  return screen ? screenPaths[screen] : null;
}
