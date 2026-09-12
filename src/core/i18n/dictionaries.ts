/**
 * Minimal typed i18n layer. Deviation from plan (next-intl) documented in
 * PROJECT_MAP: dictionary module + cookie locale keeps the App Router tree
 * static-friendly; revisit next-intl only if pluralization/ICU needs grow.
 */
export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "bos_locale";

const ar = {
  common: {
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    save: "حفظ",
    cancel: "إلغاء",
    create: "إنشاء",
    delete: "حذف",
    edit: "تعديل",
    loading: "جارٍ التحميل…",
    saved: "تم الحفظ",
    error: "حدث خطأ",
    search: "بحث",
    actions: "إجراءات",
    status: "الحالة",
    name: "الاسم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    role: "الدور",
    yes: "نعم",
    no: "لا",
    back: "رجوع",
  },
  nav: {
    dashboard: "الرئيسية",
    products: "المنتجات",
    inventory: "المخزون",
    sales: "المبيعات",
    purchases: "المشتريات",
    customers: "العملاء",
    suppliers: "الموردين",
    expenses: "المصروفات",
    finance: "المالية",
    employees: "الموظفون",
    reports: "التقارير",
    pos: "نقطة البيع",
    settings: "الإعدادات",
    users: "المستخدمون",
    roles: "الأدوار",
    audit: "سجل التدقيق",
    workflows: "الأتمتة",
    ai: "المساعد الذكي",
    appearance: "الهوية البصرية",
    more: "المزيد",
  },
  org: {
    selectTitle: "اختر المؤسسة",
    noAccess: "لا تنتمي إلى أي مؤسسة بعد",
  },
  dashboard: {
    title: "لوحة التحكم",
    welcome: "أهلًا بك",
    announcements: "الإعلانات",
  },
}

const en = {
  common: {
    signIn: "Sign in",
    signOut: "Sign out",
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    delete: "Delete",
    edit: "Edit",
    loading: "Loading…",
    saved: "Saved",
    error: "Something went wrong",
    search: "Search",
    actions: "Actions",
    status: "Status",
    name: "Name",
    email: "Email",
    password: "Password",
    role: "Role",
    yes: "Yes",
    no: "No",
    back: "Back",
  },
  nav: {
    dashboard: "Dashboard",
    products: "Products",
    inventory: "Inventory",
    sales: "Sales",
    purchases: "Purchases",
    customers: "Customers",
    suppliers: "Suppliers",
    expenses: "Expenses",
    finance: "Finance",
    employees: "Employees",
    reports: "Reports",
    pos: "POS",
    settings: "Settings",
    users: "Users",
    roles: "Roles",
    audit: "Audit log",
    workflows: "Automations",
    ai: "AI assistant",
    appearance: "Appearance",
    more: "More",
  },
  org: {
    selectTitle: "Choose organization",
    noAccess: "You don't belong to any organization yet",
  },
  dashboard: {
    title: "Dashboard",
    welcome: "Welcome",
    announcements: "Announcements",
  },
}

export type Dictionary = typeof en;

export const dictionaries: Record<Locale, Dictionary> = { ar, en };

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** Dot-path lookup, e.g. t(dict, "nav.sales"). Falls back to key itself. */
export function t(dict: Dictionary, key: string): string {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof cur === "string" ? cur : key;
}

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
