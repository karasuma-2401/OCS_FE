export type ShopNavId =
  | 'pos'
  | 'inventory'
  | 'consignment'
  | 'customers'
  | 'settlement'
  | 'reports'
  | 'settings'
  | 'accounts';

export const screenPermissions: Record<ShopNavId, string> = {
  pos: 'screens.pos',
  inventory: 'screens.inventory',
  consignment: 'screens.consignment',
  customers: 'screens.customers',
  settlement: 'screens.settlement',
  reports: 'screens.reports',
  settings: 'screens.settings',
  accounts: 'screens.accounts',
};

export const screenPaths: Record<ShopNavId, string> = {
  pos: '/shop/pos',
  inventory: '/shop/inventory',
  consignment: '/shop/consignment',
  customers: '/shop/customers',
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
  '/admin/contracts': 'consignment',
  '/admin/customers': 'customers',
  '/admin/settlement': 'settlement',
  '/admin/reports': 'reports',
  '/admin/settings': 'settings',
  '/shop/accounts': 'accounts',
};

export const screenOrder: ShopNavId[] = [
  'reports', 'pos', 'inventory', 'consignment', 'customers',
  'settlement', 'accounts', 'settings',
];

export const screenRequirements: Partial<Record<ShopNavId, string>> = {
  accounts: 'accounts.read',
  consignment: 'appointments.staff.read',
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
