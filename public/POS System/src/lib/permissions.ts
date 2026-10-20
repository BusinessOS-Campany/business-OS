export interface PermissionDef {
  key: string;
  group: string;
  label: string;
  labelAr: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "dashboard.view", group: "dashboard", label: "View dashboard", labelAr: "عرض لوحة التحكم" },
  { key: "sale.create", group: "sales", label: "Create sale", labelAr: "إنشاء مبيعات" },
  { key: "sale.edit", group: "sales", label: "Edit sale", labelAr: "تعديل المبيعات" },
  { key: "sale.delete", group: "sales", label: "Delete sale", labelAr: "حذف المبيعات" },
  { key: "sale.cancel", group: "sales", label: "Cancel sale", labelAr: "إلغاء المبيعات" },
  { key: "sale.refund", group: "sales", label: "Refund sale", labelAr: "إرجاع المبيعات" },
  { key: "sale.hold", group: "sales", label: "Hold / resume sale", labelAr: "تعليق واستئناف البيع" },
  { key: "invoice.view", group: "sales", label: "View invoices", labelAr: "عرض الفواتير" },
  { key: "invoice.create", group: "sales", label: "Create invoice", labelAr: "إنشاء فواتير" },
  { key: "invoice.print", group: "sales", label: "Print / reprint invoice", labelAr: "طباعة الفواتير" },
  { key: "price.override", group: "sales", label: "Override price", labelAr: "تعديل السعر" },
  { key: "discount.apply", group: "sales", label: "Apply discounts", labelAr: "تطبيق الخصومات" },
  { key: "product.view", group: "products", label: "View products", labelAr: "عرض المنتجات" },
  { key: "product.manage", group: "products", label: "Manage products", labelAr: "إدارة المنتجات" },
  { key: "category.manage", group: "products", label: "Manage categories", labelAr: "إدارة الأصناف" },
  { key: "promotion.manage", group: "products", label: "Manage promotions", labelAr: "إدارة العروض" },
  { key: "inventory.view", group: "inventory", label: "View inventory", labelAr: "عرض المخزون" },
  { key: "inventory.adjust", group: "inventory", label: "Adjust stock", labelAr: "تسوية المخزون" },
  { key: "transfer.manage", group: "inventory", label: "Manage stock transfers", labelAr: "إدارة التحويلات" },
  { key: "supplier.manage", group: "purchasing", label: "Manage suppliers", labelAr: "إدارة الموردين" },
  { key: "purchase.manage", group: "purchasing", label: "Manage purchases", labelAr: "إدارة المشتريات" },
  { key: "purchase.approve", group: "purchasing", label: "Approve purchase orders", labelAr: "اعتماد أوامر الشراء" },
  { key: "customer.manage", group: "customers", label: "Manage customers", labelAr: "إدارة العملاء" },
  { key: "credit.manage", group: "customers", label: "Manage credit", labelAr: "إدارة الآجال" },
  { key: "employee.manage", group: "hr", label: "Manage employees", labelAr: "إدارة الموظفين" },
  { key: "expense.manage", group: "finance", label: "Manage expenses", labelAr: "إدارة المصروفات" },
  { key: "register.manage", group: "finance", label: "Open / close registers", labelAr: "إدارة الصندوق" },
  { key: "accounting.manage", group: "finance", label: "Manage accounting", labelAr: "إدارة الحسابات" },
  { key: "report.view", group: "reports", label: "View reports", labelAr: "عرض التقارير" },
  { key: "report.export", group: "reports", label: "Export reports", labelAr: "تصدير التقارير" },
  { key: "audit.view", group: "reports", label: "View audit log", labelAr: "عرض سجل العمليات" },
  { key: "branch.manage", group: "company", label: "Manage branches", labelAr: "إدارة الفروع" },
  { key: "warehouse.manage", group: "company", label: "Manage warehouses", labelAr: "إدارة المخازن" },
  { key: "user.manage", group: "company", label: "Manage users", labelAr: "إدارة المستخدمين" },
  { key: "role.manage", group: "company", label: "Manage roles", labelAr: "إدارة الصلاحيات" },
  { key: "settings.manage", group: "company", label: "Manage settings", labelAr: "إدارة الإعدادات" },
  { key: "backup.manage", group: "company", label: "Backup & restore", labelAr: "النسخ الاحتياطي" },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export type RoleKey =
  | "OWNER"
  | "GENERAL_MANAGER"
  | "BRANCH_MANAGER"
  | "CASHIER"
  | "ACCOUNTANT"
  | "INVENTORY_MANAGER"
  | "PURCHASING_MANAGER"
  | "SALES_MANAGER"
  | "AUDITOR"
  | "WAREHOUSE_EMPLOYEE"
  | "CUSTOMER_SERVICE";

export const DEFAULT_ROLES: Record<RoleKey, { name: string; nameAr: string; permissions: string[] }> = {
  OWNER: {
    name: "Company Owner",
    nameAr: "مالك الشركة",
    permissions: PERMISSION_KEYS,
  },
  GENERAL_MANAGER: {
    name: "General Manager",
    nameAr: "مدير عام",
    permissions: PERMISSION_KEYS.filter((k) => k !== "role.manage" && k !== "backup.manage"),
  },
  BRANCH_MANAGER: {
    name: "Branch Manager",
    nameAr: "مدير فرع",
    permissions: [
      "dashboard.view", "sale.create", "sale.edit", "sale.cancel", "sale.refund", "sale.hold",
      "invoice.view", "invoice.create", "invoice.print", "price.override", "discount.apply",
      "product.view", "product.manage", "category.manage", "inventory.view", "inventory.adjust",
      "customer.manage", "credit.manage", "expense.manage", "register.manage",
      "report.view", "report.export", "purchase.manage", "supplier.manage",
    ],
  },
  CASHIER: {
    name: "Cashier",
    nameAr: "كاشير",
    permissions: [
      "dashboard.view", "sale.create", "sale.hold", "invoice.view", "invoice.print",
      "discount.apply", "product.view", "inventory.view", "customer.manage", "register.manage",
    ],
  },
  ACCOUNTANT: {
    name: "Accountant",
    nameAr: "محاسب",
    permissions: [
      "dashboard.view", "invoice.view", "expense.manage", "register.manage", "accounting.manage",
      "report.view", "report.export", "audit.view", "credit.manage", "customer.manage",
      "purchase.manage", "supplier.manage",
    ],
  },
  INVENTORY_MANAGER: {
    name: "Inventory Manager",
    nameAr: "مدير المخزون",
    permissions: [
      "dashboard.view", "product.view", "product.manage", "category.manage", "promotion.manage",
      "inventory.view", "inventory.adjust", "transfer.manage", "purchase.manage", "supplier.manage",
      "report.view", "report.export",
    ],
  },
  PURCHASING_MANAGER: {
    name: "Purchasing Manager",
    nameAr: "مدير المشتريات",
    permissions: [
      "dashboard.view", "product.view", "inventory.view", "purchase.manage", "purchase.approve",
      "supplier.manage", "report.view", "report.export",
    ],
  },
  SALES_MANAGER: {
    name: "Sales Manager",
    nameAr: "مدير المبيعات",
    permissions: [
      "dashboard.view", "sale.create", "sale.edit", "sale.cancel", "sale.refund", "sale.hold",
      "invoice.view", "invoice.create", "invoice.print", "price.override", "discount.apply",
      "customer.manage", "credit.manage", "report.view", "report.export",
    ],
  },
  AUDITOR: {
    name: "Auditor",
    nameAr: "مدقق",
    permissions: ["dashboard.view", "report.view", "report.export", "audit.view", "invoice.view", "accounting.manage"],
  },
  WAREHOUSE_EMPLOYEE: {
    name: "Warehouse Employee",
    nameAr: "موظف مخزون",
    permissions: ["inventory.view", "transfer.manage", "product.view"],
  },
  CUSTOMER_SERVICE: {
    name: "Customer Service",
    nameAr: "خدمة العملاء",
    permissions: ["sale.create", "invoice.view", "customer.manage", "credit.manage", "product.view"],
  },
};

export const GOVERNORATES_YEMEN = [
  "Sana'a",
  "Aden",
  "Taiz",
  "Ibb",
  "Hodeidah",
  "Hajjah",
  "Dhamar",
  "Marib",
  "Al Mahwit",
  "Al Bayda",
  "Amran",
  "Saada",
  "Shabwah",
  "Abyan",
  "Lahij",
  "Al Maharah",
  "Hadramawt",
  "Socotra",
];

export const GOVERNORATES_YEMEN_AR = [
  "صنعاء",
  "عدن",
  "تعز",
  "إب",
  "الحديدة",
  "حجة",
  "ذمار",
  "مأرب",
  "المحويت",
  "البيضاء",
  "عمران",
  "صعدة",
  "شبوة",
  "أبين",
  "لحج",
  "المهرة",
  "حضرموت",
  "سقطرى",
];

export const EXPENSE_CATEGORIES = [
  { name: "Rent", nameAr: "إيجار" },
  { name: "Electricity", nameAr: "كهرباء" },
  { name: "Water", nameAr: "مياه" },
  { name: "Internet", nameAr: "إنترنت" },
  { name: "Salaries", nameAr: "رواتب" },
  { name: "Transportation", nameAr: "نقل" },
  { name: "Maintenance", nameAr: "صيانة" },
  { name: "Supplies", nameAr: "مستلزمات" },
  { name: "Marketing", nameAr: "تسويق" },
  { name: "Taxes", nameAr: "ضرائب" },
  { name: "Other", nameAr: "أخرى" },
];

export const UNIT_NAMES = [
  { name: "Piece", nameAr: "قطعة", symbol: "pc", precision: 0 },
  { name: "Unit", nameAr: "وحدة", symbol: "unit", precision: 2 },
  { name: "Kilogram", nameAr: "كيلوغرام", symbol: "kg", precision: 3 },
  { name: "Gram", nameAr: "جرام", symbol: "g", precision: 0 },
  { name: "Litre", nameAr: "لتر", symbol: "L", precision: 3 },
  { name: "Millilitre", nameAr: "مل", symbol: "ml", precision: 0 },
  { name: "Carton", nameAr: "كرتونة", symbol: "ctn", precision: 0 },
  { name: "Box", nameAr: "علبة", symbol: "box", precision: 0 },
  { name: "Pack", nameAr: "حزمة", symbol: "pack", precision: 0 },
  { name: "Bottle", nameAr: "زجاجة", symbol: "btl", precision: 0 },
  { name: "Bag", nameAr: "كيس", symbol: "bag", precision: 0 },
  { name: "Tray", nameAr: "طبق", symbol: "tray", precision: 0 },
  { name: "Jar", nameAr: "برطمان", symbol: "jar", precision: 0 },
  { name: "Can", nameAr: "علبة معدنية", symbol: "can", precision: 0 },
  { name: "Dozen", nameAr: "دزينة", symbol: "dz", precision: 0 },
  { name: "Pair", nameAr: "زوج", symbol: "pr", precision: 0 },
];

export const PRICE_LEVELS = [
  { name: "Retail", nameAr: "تجزئة", isDefault: true, sortOrder: 1 },
  { name: "Wholesale", nameAr: "جملة", isDefault: false, sortOrder: 2 },
  { name: "VIP", nameAr: "مميز", isDefault: false, sortOrder: 3 },
];