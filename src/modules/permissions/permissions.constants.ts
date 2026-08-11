/** Static permission registry. Seeded at startup; not user-editable. */
export const PERMISSIONS = [
  { key: 'sales:create', description: 'Create sales orders/invoices' },
  { key: 'sales:view', description: 'View sales orders/invoices' },
  { key: 'sales:update', description: 'Edit draft sales orders/invoices' },
  { key: 'sales:cancel', description: 'Cancel issued sales invoices' },

  { key: 'purchase:create', description: 'Create purchase orders/bills' },
  { key: 'purchase:view', description: 'View purchase orders/bills' },
  { key: 'purchase:update', description: 'Edit draft purchase orders/bills' },
  { key: 'purchase:cancel', description: 'Cancel confirmed purchase bills' },

  { key: 'payments:create', description: 'Record customer/supplier payments' },
  { key: 'payments:view', description: 'View payments' },

  { key: 'inventory:view', description: 'View stock and movements' },
  { key: 'inventory:adjust', description: 'Create stock adjustments' },

  { key: 'parties:manage', description: 'Create/edit customers and suppliers' },
  { key: 'items:manage', description: 'Create/edit items and categories' },

  { key: 'reports:view', description: 'View reports' },
  { key: 'reports:export', description: 'Export reports to Excel/PDF' },

  {
    key: 'settings:manage',
    description: 'Manage company settings, GST, numbering',
  },
  { key: 'users:manage', description: 'Manage users and role assignments' },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  ADMIN: PERMISSIONS.map((p) => p.key),
  MANAGER: [
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
  ACCOUNTANT: [
    'sales:view',
    'purchase:view',
    'payments:create',
    'payments:view',
    'inventory:view',
    'reports:view',
    'reports:export',
  ],
  SALES: [
    'sales:create',
    'sales:view',
    'sales:update',
    'parties:manage',
    'inventory:view',
  ],
  PURCHASE: [
    'purchase:create',
    'purchase:view',
    'purchase:update',
    'parties:manage',
    'inventory:view',
  ],
  VIEWER: ['sales:view', 'purchase:view', 'inventory:view', 'reports:view'],
};
