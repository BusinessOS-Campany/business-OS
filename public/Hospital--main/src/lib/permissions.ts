export const MODULES = [
  "dashboard",
  "patients",
  "appointments",
  "reception",
  "queue",
  "encounters",
  "vitals",
  "prescriptions",
  "medications",
  "admissions",
  "emergency",
  "surgery",
  "nursing",
  "laboratory",
  "radiology",
  "pharmacy",
  "inventory",
  "bloodbank",
  "ambulance",
  "billing",
  "payments",
  "refunds",
  "insurance",
  "accounting",
  "expenses",
  "employees",
  "hr",
  "payroll",
  "procurement",
  "assets",
  "maintenance",
  "settings",
  "users",
  "roles",
  "audit",
  "reports",
  "notifications",
] as const;

export type ModuleKey = (typeof MODULES)[number];

export const ACTIONS = [
  "read",
  "create",
  "edit",
  "delete",
  "approve",
  "print",
  "export",
  "refund",
  "manage",
] as const;

export type ActionKey = (typeof ACTIONS)[number];

export type PermissionMap = Partial<Record<ModuleKey, ActionKey[]>>;

export const ALL: ActionKey[] = [...ACTIONS];

const rm = (...modules: ModuleKey[]): PermissionMap =>
  Object.fromEntries(modules.map((m) => [m, ALL])) as PermissionMap;

export const READ = ["read"] as ActionKey[];
export const WRITE = ["read", "create", "edit"] as ActionKey[];
export const FULL = ["read", "create", "edit", "delete"] as ActionKey[];

export const ROLE_PERMISSIONS: Record<string, PermissionMap> = {
  super_admin: rm(
    "dashboard","patients","appointments","reception","queue","encounters","vitals",
    "prescriptions","medications","admissions","emergency","surgery","nursing",
    "laboratory","radiology","pharmacy","inventory","bloodbank","ambulance","billing",
    "payments","refunds","insurance","accounting","expenses","employees","hr","payroll",
    "procurement","assets","maintenance","settings","users","roles","audit",
    "reports","notifications"
  ),
  admin: rm(
    "dashboard","patients","appointments","reception","queue","encounters","vitals",
    "prescriptions","medications","admissions","emergency","surgery","nursing",
    "laboratory","radiology","pharmacy","inventory","bloodbank","ambulance","billing",
    "payments","refunds","insurance","accounting","expenses","employees","hr","payroll",
    "procurement","assets","maintenance","settings","users","roles","audit",
    "reports","notifications"
  ),
  manager: {
    dashboard: READ,
    patients: FULL,
    appointments: WRITE,
    reception: WRITE,
    queue: WRITE,
    encounters: WRITE,
    vitals: WRITE,
    prescriptions: WRITE,
    admissions: WRITE,
    emergency: WRITE,
    surgery: WRITE,
    nursing: WRITE,
    laboratory: WRITE,
    radiology: WRITE,
    pharmacy: READ,
    inventory: WRITE,
    bloodbank: WRITE,
    ambulance: WRITE,
    billing: WRITE,
    payments: WRITE,
    insurance: WRITE,
    accounting: READ,
    expenses: WRITE,
    employees: WRITE,
    hr: READ,
    payroll: READ,
    procurement: WRITE,
    assets: WRITE,
    maintenance: WRITE,
    reports: WRITE,
    notifications: WRITE,
  },
  doctor: {
    dashboard: READ,
    patients: WRITE,
    appointments: WRITE,
    encounters: WRITE,
    vitals: WRITE,
    prescriptions: WRITE,
    medications: WRITE,
    admissions: WRITE,
    emergency: WRITE,
    surgery: WRITE,
    nursing: READ,
    laboratory: ["read", "create", "print"],
    radiology: ["read", "create", "print"],
    pharmacy: ["read"],
    bloodbank: ["read"],
    ambulance: ["read"],
    billing: ["read", "print"],
    insurance: ["read"],
    reports: ["read", "print"],
    notifications: ["read"],
  },
  nurse: {
    dashboard: READ,
    patients: WRITE,
    appointments: READ,
    encounters: WRITE,
    vitals: WRITE,
    prescriptions: READ,
    medications: WRITE,
    admissions: WRITE,
    emergency: WRITE,
    surgery: READ,
    nursing: WRITE,
    laboratory: READ,
    radiology: READ,
    pharmacy: ["read"],
    billing: READ,
    ambulance: READ,
    notifications: ["read"],
  },
  receptionist: {
    dashboard: READ,
    patients: FULL,
    appointments: WRITE,
    reception: WRITE,
    queue: WRITE,
    encounters: ["read", "create"],
    billing: ["read", "create", "print"],
    payments: ["create", "read", "print"],
    emergency: ["read", "create"],
    ambulance: ["read", "create"],
    reports: ["read", "print"],
    notifications: ["read"],
  },
  pharmacist: {
    dashboard: READ,
    pharmacy: FULL,
    prescriptions: WRITE,
    inventory: READ,
    procurement: READ,
    patients: READ,
    billing: READ,
    laboratory: READ,
    reports: ["read", "print"],
    notifications: ["read"],
  },
  lab_technician: {
    dashboard: READ,
    laboratory: WRITE,
    patients: READ,
    inventory: ["read"],
    reports: ["read", "print"],
    notifications: ["read"],
  },
  radiologist: {
    dashboard: READ,
    radiology: WRITE,
    patients: READ,
    reports: ["read", "print"],
    notifications: ["read"],
  },
  radiology_technician: {
    dashboard: READ,
    radiology: ["read", "create", "edit", "print"],
    patients: READ,
    reports: ["read", "print"],
    notifications: ["read"],
  },
  accountant: {
    dashboard: READ,
    billing: FULL,
    payments: FULL,
    refunds: FULL,
    insurance: WRITE,
    accounting: WRITE,
    expenses: WRITE,
    inventory: READ,
    pharmacy: READ,
    patients: READ,
    reports: ["read", "export", "print"],
    notifications: ["read"],
  },
  cashier: {
    dashboard: READ,
    patients: WRITE,
    appointments: READ,
    billing: WRITE,
    payments: ["read", "create", "print"],
    refunds: ["create", "read"],
    accounting: ["read"],
    reports: ["read", "print"],
    notifications: ["read"],
  },
  hr_manager: {
    dashboard: READ,
    employees: FULL,
    hr: WRITE,
    payroll: WRITE,
    users: ["read"],
    reports: ["read", "print"],
    notifications: ["read"],
  },
  inventory_manager: {
    dashboard: READ,
    inventory: WRITE,
    pharmacy: READ,
    procurement: WRITE,
    assets: READ,
    reports: ["read", "print"],
    notifications: ["read"],
  },
  ambulance_staff: {
    dashboard: READ,
    ambulance: WRITE,
    patients: WRITE,
    emergency: READ,
    appointments: READ,
    notifications: ["read"],
  },
};

/** Expand a role into a flat set of `module:action` keys. */
export function expandPermissions(map: PermissionMap): string[] {
  const keys: string[] = [];
  for (const [module, actions] of Object.entries(map)) {
    for (const action of actions) {
      keys.push(`${module}:${action}`);
    }
  }
  return keys;
}

/** Build every permission key for a role (used at seed time). */
export function permissionKeysOfRole(roleKey: string): string[] {
  const map = ROLE_PERMISSIONS[roleKey];
  if (!map) return [];
  return expandPermissions(map);
}

/** Whether a permission list (module:action strings) contains a permission. */
export function hasPermission(
  perms: string[],
  module: string,
  action: string
): boolean {
  if (perms.includes(`${module}:manage`)) return true;
  return perms.includes(`${module}:${action}`);
}

/** All module:action keys that exist in the system. */
export function allPermissionKeys(): string[] {
  const keys: string[] = [];
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      keys.push(`${module}:${action}`);
    }
  }
  return keys;
}