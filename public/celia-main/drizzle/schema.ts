import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  uuid,
  bigint,
  serial,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("employee"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hobaniIncome = pgTable(
  "hobani_income",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    income: numeric("income", { precision: 12, scale: 2 }).notNull(),
    period: text("period").notNull(),
    cardType: integer("card_type"),
    quantity: integer("quantity").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [index("hobani_income_created_at_idx").on(table.createdAt)],
);

export const transferAgents = pgTable("transfer_agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: text("agent_id").notNull().unique(),
  name: text("name").notNull(),
  apiKeyHash: text("api_key_hash"),
  status: text("status").notNull().default("OFFLINE"),
  ipAddress: text("ip_address"),
  lastHeartbeat: timestamp("last_heartbeat"),
  nasShareId: uuid("nas_share_id").references(() => nasShares.id, { onDelete: "set null" }),
  sourcePath: text("source_path"),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transferDevices = pgTable(
  "transfer_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => transferAgents.agentId, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    deviceName: text("device_name"),
    deviceLabel: text("device_label"),
    deviceType: text("device_type").notNull().default("UNKNOWN"),
    driveLetter: text("drive_letter"),
    filesystem: text("filesystem"),
    totalCapacity: bigint("total_capacity", { mode: "number" }),
    freeSpace: bigint("free_space", { mode: "number" }),
    serialNumber: text("serial_number"),
    connected: boolean("connected").notNull().default(true),
    firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("transfer_devices_agent_device_uniq").on(table.agentId, table.deviceId),
    index("transfer_devices_connected_idx").on(table.connected),
  ],
);

export const transferJobs = pgTable(
  "transfer_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobNo: serial("job_no"),
    agentId: text("agent_id").references(() => transferAgents.agentId, { onDelete: "set null" }),
    employeeId: text("employee_id").references(() => users.id, { onDelete: "set null" }),
    deviceId: uuid("device_id").references(() => transferDevices.id, { onDelete: "set null" }),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    customerNotes: text("customer_notes"),
    sourcePath: text("source_path").notNull(),
    destinationPath: text("destination_path").notNull(),
    nasShareId: uuid("nas_share_id").references(() => nasShares.id, { onDelete: "set null" }),
    totalSize: bigint("total_size", { mode: "number" }),
    transferredSize: bigint("transferred_size", { mode: "number" }).notNull().default(0),
    currentSpeed: bigint("current_speed", { mode: "number" }),
    fileCount: integer("file_count"),
    transferredFiles: integer("transferred_files").notNull().default(0),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    durationSeconds: integer("duration_seconds"),
    averageSpeed: bigint("average_speed", { mode: "number" }),
    status: text("status").notNull().default("PENDING"),
    errorMessage: text("error_message"),
    cancelRequestedAt: timestamp("cancel_requested_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("transfer_jobs_status_idx").on(table.status),
    index("transfer_jobs_created_at_idx").on(table.createdAt),
    index("transfer_jobs_status_created_at_idx").on(table.status, table.createdAt),
    index("transfer_jobs_agent_source_idx").on(table.agentId, table.sourcePath),
    index("transfer_jobs_employee_id_idx").on(table.employeeId),
  ],
);

export const transferItems = pgTable(
  "transfer_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transferJobId: uuid("transfer_job_id").references(() => transferJobs.id, { onDelete: "cascade" }),
    sourcePath: text("source_path").notNull(),
    destinationPath: text("destination_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: bigint("file_size", { mode: "number" }),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("transfer_items_job_idx").on(table.transferJobId)],
);

export const nasShares = pgTable("nas_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  protocol: text("protocol").notNull().default("SMB"),
  share: text("share").notNull(),
  username: text("username"),
  passwordEnc: text("password_enc"),
  basePath: text("base_path"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const nasListing = pgTable("nas_listing", {
  id: uuid("id").defaultRandom().primaryKey(),
  shareId: uuid("share_id")
    .notNull()
    .references(() => nasShares.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  entries: jsonb("entries")
    .$type<{ name: string; isDir: boolean }[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    ipAddress: text("ip_address"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("audit_log_created_at_idx").on(table.createdAt)],
);

export const balanceCharge = pgTable(
  "balance_charge",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [index("balance_charge_created_at_idx").on(table.createdAt)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [index("products_category_idx").on(table.category)],
);

export const productSales = pgTable(
  "product_sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("product_sales_product_id_idx").on(table.productId),
    index("product_sales_created_at_idx").on(table.createdAt),
  ],
);

export const copyRecords = pgTable(
  "copy_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    sizeGB: numeric("size_gb", { precision: 10, scale: 2 }).notNull().default("0"),
    isComplete: boolean("is_complete").notNull().default(true),
    stopReason: text("stop_reason"),
    stoppedAt: timestamp("stopped_at"),
    copiedAt: timestamp("copied_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [index("copy_records_created_at_idx").on(table.createdAt)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: text("payment_method"),
    expenseDate: timestamp("expense_date").notNull().defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("expenses_expense_date_idx").on(table.expenseDate),
    index("expenses_created_at_idx").on(table.createdAt),
  ],
);

export const advances = pgTable(
  "advances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: text("employee_id").references(() => users.id, { onDelete: "set null" }),
    employeeName: text("employee_name").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    advanceDate: timestamp("advance_date").notNull().defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("advances_employee_id_idx").on(table.employeeId),
    index("advances_advance_date_idx").on(table.advanceDate),
  ],
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    department: text("department"),
    phone: text("phone"),
    salary: numeric("salary", { precision: 12, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("employees_department_idx").on(table.department),
    index("employees_is_active_idx").on(table.isActive),
  ],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  role: text("role").primaryKey(),
  permissions: jsonb("permissions").$type<Record<string, boolean>>().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    action: text("action").notNull(),
    messageKey: text("message_key").notNull(),
    messageParams: jsonb("message_params").$type<Record<string, string | number>>(),
    entityId: text("entity_id"),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("notifications_created_at_idx").on(table.createdAt),
    index("notifications_is_read_idx").on(table.isRead),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
