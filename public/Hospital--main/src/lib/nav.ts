import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Stethoscope,
  Siren,
  BedDouble,
  Activity,
  Scissors,
  HeartPulse,
  FlaskConical,
  ScanLine,
  Pill,
  FilePlus2,
  Boxes,
  ArrowUpDown,
  Ambulance,
  ShoppingCart,
  Wrench,
  Cpu,
  Wallet,
  CreditCard,
  ShieldCheck,
  Calculator,
  BriefcaseBusiness,
  Clock3,
  Banknote,
  UserCog,
  BarChart3,
  Settings,
  Droplets,
  ConciergeBell,
  UserRound,
} from "lucide-react";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: { module: string; action?: string };
  children?: NavItem[];
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "main",
    label: "dashboard",
    items: [
      {
        key: "dashboard",
        label: "dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: { module: "dashboard" },
      },
    ],
  },
  {
    key: "clinical",
    label: "clinical",
    items: [
      {
        key: "patients",
        label: "patients",
        href: "/patients",
        icon: Users,
        permission: { module: "patients" },
      },
      {
        key: "appointments",
        label: "appointments",
        href: "/appointments",
        icon: CalendarClock,
        permission: { module: "appointments" },
      },
      {
        key: "reception",
        label: "reception",
        href: "/reception",
        icon: ConciergeBell,
        permission: { module: "reception" },
      },
      {
        key: "opd",
        label: "opd",
        href: "/encounters",
        icon: Stethoscope,
        permission: { module: "encounters" },
      },
      {
        key: "emergency",
        label: "emergency",
        href: "/emergency",
        icon: Siren,
        permission: { module: "emergency" },
      },
      {
        key: "inpatients",
        label: "inpatients",
        href: "/admissions",
        icon: BedDouble,
        permission: { module: "admissions" },
      },
      {
        key: "icu",
        label: "icu",
        href: "/admissions?type=icu",
        icon: Activity,
        permission: { module: "admissions" },
      },
      {
        key: "surgery",
        label: "surgery",
        href: "/surgery",
        icon: Scissors,
        permission: { module: "surgery" },
      },
      {
        key: "nursing",
        label: "nursing",
        href: "/nursing",
        icon: HeartPulse,
        permission: { module: "nursing" },
      },
    ],
  },
  {
    key: "diagnostics",
    label: "diagnostics",
    items: [
      {
        key: "laboratory",
        label: "laboratory",
        href: "/laboratory",
        icon: FlaskConical,
        permission: { module: "laboratory" },
      },
      {
        key: "radiology",
        label: "radiology",
        href: "/radiology",
        icon: ScanLine,
        permission: { module: "radiology" },
      },
      {
        key: "bloodBank",
        label: "bloodBank",
        href: "/blood-bank",
        icon: Droplets,
        permission: { module: "bloodbank" },
      },
    ],
  },
  {
    key: "pharmacy",
    label: "pharmacy",
    items: [
      {
        key: "medicines",
        label: "medicines",
        href: "/pharmacy/medicines",
        icon: Pill,
        permission: { module: "pharmacy" },
      },
      {
        key: "prescriptions",
        label: "prescriptions",
        href: "/pharmacy/prescriptions",
        icon: FilePlus2,
        permission: { module: "prescriptions" },
      },
      {
        key: "inventory",
        label: "inventory",
        href: "/inventory",
        icon: Boxes,
        permission: { module: "inventory" },
      },
    ],
  },
  {
    key: "operations",
    label: "operations",
    items: [
      {
        key: "ambulances",
        label: "ambulances",
        href: "/ambulance",
        icon: Ambulance,
        permission: { module: "ambulance" },
      },
      {
        key: "procurement",
        label: "procurement",
        href: "/procurement",
        icon: ShoppingCart,
        permission: { module: "procurement" },
      },
      {
        key: "assets",
        label: "assets",
        href: "/assets",
        icon: Cpu,
        permission: { module: "assets" },
      },
      {
        key: "maintenance",
        label: "maintenance",
        href: "/maintenance",
        icon: Wrench,
        permission: { module: "maintenance" },
      },
    ],
  },
  {
    key: "finance",
    label: "finance",
    items: [
      {
        key: "billing",
        label: "billing",
        href: "/billing",
        icon: Wallet,
        permission: { module: "billing" },
      },
      {
        key: "payments",
        label: "payments",
        href: "/payments",
        icon: CreditCard,
        permission: { module: "payments" },
      },
      {
        key: "insurance",
        label: "insurance",
        href: "/insurance",
        icon: ShieldCheck,
        permission: { module: "insurance" },
      },
      {
        key: "accounting",
        label: "accounting",
        href: "/accounting",
        icon: Calculator,
        permission: { module: "accounting" },
      },
    ],
  },
  {
    key: "administration",
    label: "administration",
    items: [
      {
        key: "employees",
        label: "employees",
        href: "/employees",
        icon: BriefcaseBusiness,
        permission: { module: "employees" },
      },
      {
        key: "hr",
        label: "hr",
        href: "/hr",
        icon: Clock3,
        permission: { module: "hr" },
      },
      {
        key: "payroll",
        label: "payroll",
        href: "/payroll",
        icon: Banknote,
        permission: { module: "payroll" },
      },
      {
        key: "users",
        label: "users",
        href: "/admin/users",
        icon: UserCog,
        permission: { module: "users" },
      },
    ],
  },
  {
    key: "insight",
    label: "reports",
    items: [
      {
        key: "reports",
        label: "reports",
        href: "/reports",
        icon: BarChart3,
        permission: { module: "reports" },
      },
      {
        key: "settings",
        label: "settings",
        href: "/settings",
        icon: Settings,
        permission: { module: "settings" },
      },
    ],
  },
];

export function findNavItem(key: string): NavItem[] {
  const flat: NavItem[] = [];
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      flat.push(item);
      if (item.children) flat.push(...item.children);
    }
  }
  return flat.filter((i) => i.key === key);
}

export function pathToNavKey(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "dashboard";
  const root = segments[0];
  const map: Record<string, string> = {
    dashboard: "dashboard",
    patients: "patients",
    appointments: "appointments",
    reception: "reception",
    encounters: "opd",
    emergency: "emergency",
    admissions: "inpatients",
    surgery: "surgery",
    nursing: "nursing",
    laboratory: "laboratory",
    radiology: "radiology",
    bloodbank: "bloodBank",
    "blood-bank": "bloodBank",
    pharmacy: "medicines",
    inventory: "inventory",
    ambulance: "ambulances",
    procurement: "procurement",
    assets: "assets",
    maintenance: "maintenance",
    billing: "billing",
    payments: "payments",
    insurance: "insurance",
    accounting: "accounting",
    employees: "employees",
    hr: "hr",
    payroll: "payroll",
    reports: "reports",
    settings: "settings",
    admin: segments[1] === "roles" ? "users" : "users",
  };
  return map[root] ?? null;
}

export const QUICK_ACTIONS = [
  { key: "registerPatient", href: "/patients/new", icon: UserRound, permission: { module: "patients", action: "create" } },
  { key: "newAppointment", href: "/appointments/new", icon: CalendarClock, permission: { module: "appointments", action: "create" } },
  { key: "newConsultation", href: "/encounters", icon: Stethoscope, permission: { module: "encounters", action: "create" } },
  { key: "emergencyPatient", href: "/emergency", icon: Siren, permission: { module: "emergency", action: "create" } },
  { key: "createInvoice", href: "/billing/new", icon: Wallet, permission: { module: "billing", action: "create" } },
  { key: "labOrder", href: "/laboratory", icon: FlaskConical, permission: { module: "laboratory", action: "create" } },
  { key: "admitPatient", href: "/admissions/new", icon: BedDouble, permission: { module: "admissions", action: "create" } },
  { key: "avail", href: "/pharmacy/medicines", icon: Pill, permission: { module: "pharmacy", action: "create" } },
];