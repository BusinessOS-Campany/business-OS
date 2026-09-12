export const USER_ROLES = ["admin", "manager", "receptionist", "accountant", "employee"] as const;

export type UserRole = (typeof USER_ROLES)[number];
