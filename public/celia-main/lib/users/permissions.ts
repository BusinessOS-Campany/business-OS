export const PERMISSION_KEYS = [
  "dashboard",
  "add_hobani_income",
  "add_balance",
  "incomplete_copy",
  "daily_income",
  "weekly_income",
  "monthly_income",
  "total_hobani_income",
  "morning_income",
  "evening_income",
  "total_sales",
  "total_recharge",
  "add_product",
  "sold_products",
  "daily_sold_products",
  "add_expenses",
  "view_expenses",
  "add_loan",
  "view_loans",
  "set_copy_price",
  "set_product_price",
  "manage_roles",
  "manage_salaries",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface PermissionGroup {
  key: string;
  keys: PermissionKey[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { key: "dashboard", keys: ["dashboard"] },
  {
    key: "income",
    keys: [
      "add_hobani_income",
      "add_balance",
      "incomplete_copy",
      "daily_income",
      "weekly_income",
      "monthly_income",
      "total_hobani_income",
      "morning_income",
      "evening_income",
    ],
  },
  {
    key: "sales",
    keys: ["total_sales", "total_recharge", "add_product", "sold_products", "daily_sold_products"],
  },
  {
    key: "expenses",
    keys: ["add_expenses", "view_expenses", "add_loan", "view_loans"],
  },
  {
    key: "settings",
    keys: ["set_copy_price", "set_product_price"],
  },
  {
    key: "system",
    keys: ["manage_roles", "manage_salaries"],
  },
];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}
