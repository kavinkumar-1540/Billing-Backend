/**
 * Static seed data for the dynamic permission catalog (PermissionModule ->
 * SubModule -> Api). Every endpointPaths entry below is a route pattern
 * verified directly against the real controller source during migration
 * from the old static @RequirePermissions('key') system - none are guessed.
 */

export interface ApiSeedEntry {
  unique_key: string;
  method: string;
  endpointPaths: string[];
}

export interface SubModuleSeedEntry {
  subModuleName: string;
  unique_key: string;
}

export interface ModuleSeedEntry {
  moduleName: string;
  path: string;
  icon: string;
  order: number;
  subModules: SubModuleSeedEntry[];
}

export const MODULE_SEED: ModuleSeedEntry[] = [
  {
    moduleName: 'Sales',
    path: '/sales',
    icon: 'shopping-cart',
    order: 1,
    subModules: [
      { subModuleName: 'Create Sales', unique_key: 'sales:create' },
      { subModuleName: 'View Sales', unique_key: 'sales:view' },
      { subModuleName: 'Update Sales', unique_key: 'sales:update' },
      { subModuleName: 'Cancel Sales', unique_key: 'sales:cancel' },
    ],
  },
  {
    moduleName: 'Purchase',
    path: '/purchase',
    icon: 'shopping-bag',
    order: 2,
    subModules: [
      { subModuleName: 'Create Purchase', unique_key: 'purchase:create' },
      { subModuleName: 'View Purchase', unique_key: 'purchase:view' },
      { subModuleName: 'Update Purchase', unique_key: 'purchase:update' },
      { subModuleName: 'Cancel Purchase', unique_key: 'purchase:cancel' },
    ],
  },
  {
    moduleName: 'Payments',
    path: '/payments',
    icon: 'credit-card',
    order: 3,
    subModules: [
      { subModuleName: 'Create Payments', unique_key: 'payments:create' },
      { subModuleName: 'View Payments', unique_key: 'payments:view' },
    ],
  },
  {
    moduleName: 'Inventory',
    path: '/inventory',
    icon: 'package',
    order: 4,
    subModules: [
      { subModuleName: 'View Inventory', unique_key: 'inventory:view' },
      { subModuleName: 'Adjust Inventory', unique_key: 'inventory:adjust' },
    ],
  },
  {
    moduleName: 'Parties & Items',
    path: '/parties',
    icon: 'users',
    order: 5,
    subModules: [
      { subModuleName: 'Manage Parties', unique_key: 'parties:manage' },
      { subModuleName: 'Manage Items', unique_key: 'items:manage' },
    ],
  },
  {
    moduleName: 'Reports',
    path: '/reports',
    icon: 'bar-chart',
    order: 6,
    subModules: [
      { subModuleName: 'View Reports', unique_key: 'reports:view' },
      { subModuleName: 'Export Reports', unique_key: 'reports:export' },
    ],
  },
  {
    moduleName: 'Settings & Users',
    path: '/settings',
    icon: 'settings',
    order: 7,
    subModules: [
      { subModuleName: 'Manage Settings', unique_key: 'settings:manage' },
      { subModuleName: 'Manage Users', unique_key: 'users:manage' },
    ],
  },
];

export const API_SEED: ApiSeedEntry[] = [
  // sales:create
  {
    unique_key: 'sales:create',
    method: 'POST',
    endpointPaths: [
      '/sales-invoices',
      '/sales-invoices/from-order/:salesOrderId',
      '/sales-orders',
      '/credit-notes',
    ],
  },
  // sales:view
  {
    unique_key: 'sales:view',
    method: 'GET',
    endpointPaths: [
      '/sales-invoices',
      '/sales-invoices/:id',
      '/sales-orders',
      '/sales-orders/:id',
      '/credit-notes',
      '/credit-notes/:id',
    ],
  },
  // sales:cancel
  {
    unique_key: 'sales:cancel',
    method: 'PATCH',
    endpointPaths: ['/sales-invoices/:id/cancel', '/sales-orders/:id/cancel'],
  },
  // purchase:create
  {
    unique_key: 'purchase:create',
    method: 'POST',
    endpointPaths: [
      '/purchase-bills',
      '/purchase-bills/from-order/:purchaseOrderId',
      '/purchase-orders',
      '/debit-notes',
    ],
  },
  // purchase:view
  {
    unique_key: 'purchase:view',
    method: 'GET',
    endpointPaths: [
      '/purchase-bills',
      '/purchase-bills/:id',
      '/purchase-orders',
      '/purchase-orders/:id',
      '/debit-notes',
      '/debit-notes/:id',
      '/bill-adjustments',
      '/bill-adjustments/:id',
    ],
  },
  // purchase:update
  {
    unique_key: 'purchase:update',
    method: 'POST',
    endpointPaths: ['/bill-adjustments'],
  },
  // purchase:cancel
  {
    unique_key: 'purchase:cancel',
    method: 'PATCH',
    endpointPaths: [
      '/purchase-bills/:id/cancel',
      '/purchase-orders/:id/cancel',
    ],
  },
  // payments:create
  {
    unique_key: 'payments:create',
    method: 'POST',
    endpointPaths: ['/payments'],
  },
  // payments:view
  {
    unique_key: 'payments:view',
    method: 'GET',
    endpointPaths: [
      '/payments/receipts',
      '/payments/supplier-payments',
      '/payments/:id',
      '/payments/:id/allocations',
    ],
  },
  // inventory:view
  {
    unique_key: 'inventory:view',
    method: 'GET',
    endpointPaths: ['/inventory/stock', '/inventory/movements'],
  },
  // inventory:adjust
  {
    unique_key: 'inventory:adjust',
    method: 'POST',
    endpointPaths: ['/inventory/adjustments'],
  },
  // parties:manage (all methods, mixed - one Api row per method)
  {
    unique_key: 'parties:manage',
    method: 'POST',
    endpointPaths: ['/parties'],
  },
  {
    unique_key: 'parties:manage',
    method: 'GET',
    endpointPaths: ['/parties', '/parties/:id'],
  },
  {
    unique_key: 'parties:manage',
    method: 'PATCH',
    endpointPaths: ['/parties/:id'],
  },
  {
    unique_key: 'parties:manage',
    method: 'DELETE',
    endpointPaths: ['/parties/:id'],
  },
  // items:manage
  {
    unique_key: 'items:manage',
    method: 'POST',
    endpointPaths: ['/items', '/categories'],
  },
  {
    unique_key: 'items:manage',
    method: 'PATCH',
    endpointPaths: ['/items/:id', '/categories/:id'],
  },
  {
    unique_key: 'items:manage',
    method: 'DELETE',
    endpointPaths: ['/items/:id', '/categories/:id'],
  },
  {
    unique_key: 'items:manage',
    method: 'GET',
    endpointPaths: ['/categories'],
  },
  // reports:view
  {
    unique_key: 'reports:view',
    method: 'GET',
    endpointPaths: [
      '/audit-logs',
      '/reports/sales',
      '/reports/purchases',
      '/reports/gst',
      '/reports/inventory',
      '/reports/outstanding',
      '/reports/creditors',
      '/reports/debtors',
      '/reports/payments',
      '/reports/monthly',
      '/reports/gst-register',
      '/reports/stock-movement',
      '/reports/ledger',
    ],
  },
  // reports:export
  {
    unique_key: 'reports:export',
    method: 'GET',
    endpointPaths: [
      '/exports/sales.xlsx',
      '/exports/purchases.xlsx',
      '/exports/gst.xlsx',
      '/exports/inventory.xlsx',
      '/exports/outstanding.xlsx',
      '/exports/creditors.xlsx',
      '/exports/debtors.xlsx',
      '/exports/payments.xlsx',
      '/exports/audit.xlsx',
    ],
  },
  // settings:manage
  {
    unique_key: 'settings:manage',
    method: 'PATCH',
    endpointPaths: ['/companies/current', '/tax-rates/:id'],
  },
  {
    unique_key: 'settings:manage',
    method: 'POST',
    endpointPaths: ['/tax-rates'],
  },
  {
    unique_key: 'settings:manage',
    method: 'DELETE',
    endpointPaths: ['/tax-rates/:id'],
  },
  // users:manage
  {
    unique_key: 'users:manage',
    method: 'POST',
    endpointPaths: ['/company-members', '/roles', '/permissions'],
  },
  {
    unique_key: 'users:manage',
    method: 'PATCH',
    endpointPaths: [
      '/company-members/:id/role',
      '/company-members/:id/status',
      '/company-members/:id/profile',
      '/roles/:id',
    ],
  },
  {
    unique_key: 'users:manage',
    method: 'DELETE',
    endpointPaths: ['/company-members/:id', '/roles/:id'],
  },
];

/**
 * Default permission grants per role, unchanged from the old
 * DEFAULT_ROLE_PERMISSIONS map - now expressed as SubModule unique_keys.
 */
export const ROLE_SEED: {
  roleKey: string;
  name: string;
  permissions: string[];
}[] = [
  {
    roleKey: 'admin',
    name: 'ADMIN',
    permissions: MODULE_SEED.flatMap((m) =>
      m.subModules.map((s) => s.unique_key),
    ),
  },
  {
    roleKey: 'manager',
    name: 'MANAGER',
    permissions: [
      'sales:create',
      'sales:view',
      'sales:update',
      'sales:cancel',
      'purchase:create',
      'purchase:view',
      'purchase:update',
      'purchase:cancel',
      'payments:create',
      'payments:view',
      'inventory:view',
      'inventory:adjust',
      'parties:manage',
      'items:manage',
      'reports:view',
      'reports:export',
    ],
  },
  {
    roleKey: 'accountant',
    name: 'ACCOUNTANT',
    permissions: [
      'sales:view',
      'purchase:view',
      'payments:create',
      'payments:view',
      'inventory:view',
      'reports:view',
      'reports:export',
    ],
  },
  {
    roleKey: 'sales',
    name: 'SALES',
    permissions: [
      'sales:create',
      'sales:view',
      'sales:update',
      'parties:manage',
      'inventory:view',
    ],
  },
  {
    roleKey: 'purchase',
    name: 'PURCHASE',
    permissions: [
      'purchase:create',
      'purchase:view',
      'purchase:update',
      'parties:manage',
      'inventory:view',
    ],
  },
  {
    roleKey: 'viewer',
    name: 'VIEWER',
    permissions: [
      'sales:view',
      'purchase:view',
      'inventory:view',
      'reports:view',
    ],
  },
];
