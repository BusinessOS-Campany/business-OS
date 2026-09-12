import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { AGENT_ONLINE_WINDOW_MS } from "./constants";
import { cached } from "@/lib/cache";
import { logAudit } from "./audit";
import { logger } from "@/lib/logger";
import type {
  TransferAgentView,
  TransferDeviceView,
  TransferFilters,
  TransferJobView,
} from "./types";

const jobSelection = {
  id: schema.transferJobs.id,
  jobNo: schema.transferJobs.jobNo,
  agentId: schema.transferJobs.agentId,
  agentName: schema.transferAgents.name,
  employeeId: schema.transferJobs.employeeId,
  employeeName: schema.users.name,
  deviceId: schema.transferJobs.deviceId,
  deviceName: schema.transferDevices.deviceName,
  deviceType: schema.transferDevices.deviceType,
  driveLetter: schema.transferDevices.driveLetter,
  customerName: schema.transferJobs.customerName,
  customerPhone: schema.transferJobs.customerPhone,
  customerNotes: schema.transferJobs.customerNotes,
  sourcePath: schema.transferJobs.sourcePath,
  destinationPath: schema.transferJobs.destinationPath,
  totalSize: schema.transferJobs.totalSize,
  transferredSize: schema.transferJobs.transferredSize,
  currentSpeed: schema.transferJobs.currentSpeed,
  fileCount: schema.transferJobs.fileCount,
  transferredFiles: schema.transferJobs.transferredFiles,
  startTime: schema.transferJobs.startTime,
  endTime: schema.transferJobs.endTime,
  durationSeconds: schema.transferJobs.durationSeconds,
  averageSpeed: schema.transferJobs.averageSpeed,
  status: schema.transferJobs.status,
  errorMessage: schema.transferJobs.errorMessage,
  createdAt: schema.transferJobs.createdAt,
};

function jobBase() {
  return db
    .select(jobSelection)
    .from(schema.transferJobs)
    .leftJoin(schema.users, eq(schema.transferJobs.employeeId, schema.users.id))
    .leftJoin(
      schema.transferDevices,
      eq(schema.transferJobs.deviceId, schema.transferDevices.id),
    )
    .leftJoin(
      schema.transferAgents,
      eq(schema.transferJobs.agentId, schema.transferAgents.agentId),
    );
}

type JobRow = Awaited<ReturnType<typeof jobBase>>[number];

function toJobView(row: JobRow): TransferJobView {
  const total = row.totalSize ?? 0;
  const done = row.transferredSize ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return {
    ...row,
    deviceType: (row.deviceType ?? null) as unknown as TransferJobView["deviceType"],
    status: row.status as unknown as TransferJobView["status"],
    totalSize: row.totalSize,
    currentSpeed: row.currentSpeed,
    percent,
  };
}

function buildJobConditions(filters: TransferFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(schema.transferJobs.status, filters.status));
  if (filters.employeeId) conditions.push(eq(schema.transferJobs.employeeId, filters.employeeId));
  if (filters.agentId) conditions.push(eq(schema.transferJobs.agentId, filters.agentId));
  if (filters.deviceId) conditions.push(eq(schema.transferJobs.deviceId, filters.deviceId));
  if (filters.deviceType) conditions.push(eq(schema.transferDevices.deviceType, filters.deviceType));
  if (filters.customer) {
    conditions.push(ilike(schema.transferJobs.customerName, `%${filters.customer}%`));
  }
  if (filters.source) {
    conditions.push(ilike(schema.transferJobs.sourcePath, `%${filters.source}%`));
  }
  if (filters.dateFrom) conditions.push(gte(schema.transferJobs.createdAt, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(schema.transferJobs.createdAt, new Date(filters.dateTo)));
  if (filters.search) {
    const like = `%${filters.search}%`;
    const searchCondition = or(
      ilike(schema.transferJobs.sourcePath, like),
      ilike(schema.transferJobs.destinationPath, like),
      ilike(schema.transferJobs.customerName, like),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  return conditions;
}

export async function getTransferJobs(filters: TransferFilters = {}): Promise<TransferJobView[]> {
  const conditions = buildJobConditions(filters);
  const rows = await jobBase()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.transferJobs.createdAt))
    .limit(Math.min(filters.limit ?? 100, 500))
    .offset(filters.offset ?? 0);
  return rows.map(toJobView);
}

export async function getTransferJobById(id: string): Promise<TransferJobView | null> {
  const rows = await jobBase().where(eq(schema.transferJobs.id, id)).limit(1);
  return rows.length > 0 ? toJobView(rows[0]) : null;
}

const AGENT_FOLDERS_TTL_MS = 5 * 60 * 1000;

/**
 * Distinct source folders each agent has copied from, derived from its
 * transfer jobs. Capped per agent to keep payloads small. Cached for five
 * minutes because the dashboard polls this every few seconds and the GROUP BY
 * scans every transfer job.
 */
export function getAgentFolders(agentIds: string[], limit = 8): Promise<Map<string, string[]>> {
  const ids = agentIds.filter((id): id is string => id !== null);
  if (ids.length === 0) return Promise.resolve(new Map());
  return cached(`transfers:agent-folders:${ids.join(",")}:${limit}`, AGENT_FOLDERS_TTL_MS, async () => {
    const folders = new Map<string, string[]>();

    const rows = await db
      .select({
        agentId: schema.transferJobs.agentId,
        sourcePath: schema.transferJobs.sourcePath,
      })
      .from(schema.transferJobs)
      .where(inArray(schema.transferJobs.agentId, ids))
      .groupBy(schema.transferJobs.agentId, schema.transferJobs.sourcePath);

    for (const row of rows) {
      if (!row.agentId || !row.sourcePath) continue;
      const list = folders.get(row.agentId) ?? [];
      if (list.length >= limit) continue;
      list.push(row.sourcePath);
      folders.set(row.agentId, list);
    }
    return folders;
  });
}

export const STALE_RUNNING_MS = 3 * 60 * 1000;
export const STALE_PENDING_MS = 15 * 60 * 1000;

export async function failStaleTransfers(): Promise<number> {
  const now = Date.now();
  const agentCutoff = new Date(now - AGENT_ONLINE_WINDOW_MS);
  const runningCutoff = new Date(now - STALE_RUNNING_MS);
  const pendingCutoff = new Date(now - STALE_PENDING_MS);

  const stale = await db
    .select({
      id: schema.transferJobs.id,
      jobNo: schema.transferJobs.jobNo,
      status: schema.transferJobs.status,
    })
    .from(schema.transferJobs)
    .leftJoin(schema.transferAgents, eq(schema.transferJobs.agentId, schema.transferAgents.agentId))
    .where(
      and(
        or(eq(schema.transferJobs.status, "PENDING"), eq(schema.transferJobs.status, "RUNNING")),
        or(
          isNull(schema.transferAgents.lastHeartbeat),
          lt(schema.transferAgents.lastHeartbeat, agentCutoff),
        ),
        or(
          and(
            eq(schema.transferJobs.status, "RUNNING"),
            lt(schema.transferJobs.updatedAt, runningCutoff),
          ),
          and(
            eq(schema.transferJobs.status, "PENDING"),
            lt(schema.transferJobs.createdAt, pendingCutoff),
          ),
        ),
      ),
    )
    .limit(100);

  let failed = 0;
  for (const job of stale) {
    await db
      .update(schema.transferJobs)
      .set({
        status: "FAILED",
        endTime: new Date(),
        errorMessage: `Auto-failed: ${job.status} job left incomplete (agent offline).`,
        updatedAt: new Date(),
      })
      .where(eq(schema.transferJobs.id, job.id));
    await logAudit({
      action: "TRANSFER_STALE_FAILED",
      entityType: "TRANSFER_JOB",
      entityId: job.id,
      metadata: { jobNo: job.jobNo, previousStatus: job.status },
    });
    failed += 1;
  }
  if (failed > 0) logger.info(`auto-failed ${failed} stale transfer job(s)`);
  return failed;
}

export async function hasActiveJobForDevice(deviceId: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.transferJobs.id })
    .from(schema.transferJobs)
    .where(
      and(
        eq(schema.transferJobs.deviceId, deviceId),
        or(eq(schema.transferJobs.status, "PENDING"), eq(schema.transferJobs.status, "RUNNING")),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function getTransferDevices(connectedOnly = false): Promise<TransferDeviceView[]> {
  const now = Date.now();
  const rows = await db
    .select()
    .from(schema.transferDevices)
    .innerJoin(schema.transferAgents, eq(schema.transferDevices.agentId, schema.transferAgents.agentId))
    .where(
      connectedOnly
        ? and(
            eq(schema.transferDevices.connected, true),
            gte(schema.transferAgents.lastHeartbeat, new Date(now - AGENT_ONLINE_WINDOW_MS)),
          )
        : undefined,
    )
    .orderBy(desc(schema.transferDevices.lastSeenAt));
  return rows.map((row) => {
    const device = row.transfer_devices;
    return {
      id: device.id,
      agentId: device.agentId,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceLabel: device.deviceLabel,
      deviceType: device.deviceType as TransferDeviceView["deviceType"],
      driveLetter: device.driveLetter,
      filesystem: device.filesystem,
      totalCapacity: device.totalCapacity,
      freeSpace: device.freeSpace,
      serialNumber: device.serialNumber,
      connected: device.connected,
      firstSeenAt: device.firstSeenAt,
      lastSeenAt: device.lastSeenAt,
    };
  });
}

export async function getAgents(): Promise<TransferAgentView[]> {
  const rows = await db
    .select({
      agent: schema.transferAgents,
      share: schema.nasShares,
    })
    .from(schema.transferAgents)
    .leftJoin(schema.nasShares, eq(schema.transferAgents.nasShareId, schema.nasShares.id))
    .orderBy(schema.transferAgents.name);

  const folders = await getAgentFolders(rows.map((row) => row.agent.agentId));
  const now = Date.now();
  return rows.map((row) => agentToView(row.agent, row.share, folders, now));
}

export async function getAgentById(agentId: string): Promise<TransferAgentView | null> {
  const rows = await db
    .select({
      agent: schema.transferAgents,
      share: schema.nasShares,
    })
    .from(schema.transferAgents)
    .leftJoin(schema.nasShares, eq(schema.transferAgents.nasShareId, schema.nasShares.id))
    .where(eq(schema.transferAgents.agentId, agentId));
  const row = rows[0];
  if (!row) return null;
  const folders = await getAgentFolders([row.agent.agentId]);
  return agentToView(row.agent, row.share, folders, Date.now());
}

function shareLabelOf(share: typeof schema.nasShares.$inferSelect | null): string | null {
  if (!share) return null;
  const label = `\\\\${share.host}\\${share.share}`;
  const base = (share.basePath ?? "").replace(/^[\\/]+|[\\/]+$/g, "");
  return base ? `${label}\\${base}` : label;
}

function agentToView(
  agent: typeof schema.transferAgents.$inferSelect,
  share: typeof schema.nasShares.$inferSelect | null,
  foldersByAgent: Map<string, string[]>,
  now: number,
): TransferAgentView {
  const shareOffline = share !== null && share.isActive === false;
  const heartbeatOnline =
    agent.lastHeartbeat !== null && now - agent.lastHeartbeat.getTime() <= AGENT_ONLINE_WINDOW_MS;
  return {
    agentId: agent.agentId,
    name: agent.name,
    status: shareOffline || !heartbeatOnline ? ("OFFLINE" as const) : ("ONLINE" as const),
    ipAddress: agent.ipAddress,
    lastHeartbeat: agent.lastHeartbeat,
    firstSeenAt: agent.firstSeenAt,
    nasShareId: share?.id ?? null,
    shareLabel: shareLabelOf(share),
    serverHost: serverHostOf(foldersByAgent.get(agent.agentId) ?? [], share),
    folders: foldersByAgent.get(agent.agentId) ?? [],
  };
}

/**
 * The server an agent copies from, derived from the UNC paths it actually
 * copied (host portion), falling back to the linked share's host.
 */
function serverHostOf(
  folders: string[],
  share: typeof schema.nasShares.$inferSelect | null,
): string | null {
  for (const folder of folders) {
    const match = /^\\{1,2}([^\\/]+)(?:\\|$)/.exec(folder.trim());
    if (match) return match[1];
  }
  return share?.host ?? null;
}

export async function assignAgentShare(
  agentId: string,
  nasShareId: string | null,
): Promise<boolean> {
  const [row] = await db
    .update(schema.transferAgents)
    .set({ nasShareId, updatedAt: new Date() })
    .where(eq(schema.transferAgents.agentId, agentId))
    .returning({ agentId: schema.transferAgents.agentId });
  return row !== undefined;
}

export interface TodayTransferStats {
  totalTransfers: number;
  totalBytes: number;
  completed: number;
  failed: number;
  cancelled: number;
  running: number;
}

export interface DeviceTypeStat {
  deviceType: string;
  transfers: number;
  bytes: number;
}

export interface DashboardTransferStats {
  today: TodayTransferStats;
  active: TransferJobView[];
  recent: TransferJobView[];
  deviceTypeStats: DeviceTypeStat[];
  agents: TransferAgentView[];
}

function startOfLocalDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const DASHBOARD_TRANSFER_STATS_TTL_MS = 5_000;

export function getDashboardTransferStats(): Promise<DashboardTransferStats> {
  return cached("transfers:dashboard-stats", DASHBOARD_TRANSFER_STATS_TTL_MS, () =>
    computeDashboardTransferStats(),
  );
}

async function computeDashboardTransferStats(): Promise<DashboardTransferStats> {
  const today = startOfLocalDay();
  const [todayRows, activeRows, recentRows, deviceStats] = await Promise.all([
    db
      .select({
        status: schema.transferJobs.status,
        files: count(),
        bytes: sql<number>`coalesce(sum(${schema.transferJobs.transferredSize}), 0)`,
      })
      .from(schema.transferJobs)
      .where(gte(schema.transferJobs.createdAt, today))
      .groupBy(schema.transferJobs.status),
    jobBase().where(
      or(eq(schema.transferJobs.status, "PENDING"), eq(schema.transferJobs.status, "RUNNING")),
    ),
    jobBase().orderBy(desc(schema.transferJobs.createdAt)).limit(8),
    db
      .select({
        deviceType: schema.transferDevices.deviceType,
        transfers: count(schema.transferJobs.id),
        bytes: sql<number>`coalesce(sum(${schema.transferJobs.transferredSize}), 0)`,
      })
      .from(schema.transferJobs)
      .leftJoin(
        schema.transferDevices,
        eq(schema.transferJobs.deviceId, schema.transferDevices.id),
      )
      .where(eq(schema.transferJobs.status, "COMPLETED"))
      .groupBy(schema.transferDevices.deviceType)
      .orderBy(desc(count(schema.transferJobs.id))),
  ]);

  const todayStats: TodayTransferStats = {
    totalTransfers: 0,
    totalBytes: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    running: 0,
  };
  for (const row of todayRows) {
    todayStats.totalTransfers += row.files;
    todayStats.totalBytes += Number(row.bytes ?? 0);
    if (row.status === "COMPLETED") todayStats.completed = row.files;
    if (row.status === "FAILED") todayStats.failed = row.files;
    if (row.status === "CANCELLED") todayStats.cancelled = row.files;
    if (row.status === "RUNNING") todayStats.running = row.files;
  }

  return {
    today: todayStats,
    active: activeRows.map(toJobView),
    recent: recentRows.map(toJobView),
    deviceTypeStats: deviceStats.map((row) => ({
      deviceType: row.deviceType ?? "UNKNOWN",
      transfers: row.transfers,
      bytes: Number(row.bytes ?? 0),
    })),
    agents: await getAgents(),
  };
}

export interface ReportRow {
  day: string;
  transfers: number;
  bytes: number;
}

export interface EmployeeStat {
  employeeName: string | null;
  transfers: number;
  bytes: number;
}

export interface FolderStat {
  sourcePath: string;
  transfers: number;
  bytes: number;
}

export interface TransferReport {
  period: "today" | "week" | "month";
  totalTransfers: number;
  totalBytes: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageSize: number;
  averageSpeed: number;
  breakdown: ReportRow[];
  employeeStats: EmployeeStat[];
  deviceTypeStats: DeviceTypeStat[];
  topFolders: FolderStat[];
}

function periodStart(period: TransferReport["period"]): Date {
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(1);
  }
  return start;
}

export async function getTransferReport(
  period: TransferReport["period"],
): Promise<TransferReport> {
  const from = periodStart(period);

  const [totals, breakdown, employeeStats, deviceTypeStats, topFolders] = await Promise.all([
    db
      .select({
        files: count(),
        bytes: sql<number>`coalesce(sum(${schema.transferJobs.transferredSize}), 0)`,
        completed: sql<number>`count(*) filter (where ${schema.transferJobs.status} = 'COMPLETED')`,
        failed: sql<number>`count(*) filter (where ${schema.transferJobs.status} = 'FAILED')`,
        cancelled: sql<number>`count(*) filter (where ${schema.transferJobs.status} = 'CANCELLED')`,
        averageSpeed: sql<number>`coalesce(avg(${schema.transferJobs.averageSpeed}) filter (where ${schema.transferJobs.status} = 'COMPLETED'), 0)`,
      })
      .from(schema.transferJobs)
      .where(gte(schema.transferJobs.createdAt, from)),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${schema.transferJobs.createdAt}), 'YYYY-MM-DD')`,
        transfers: count(),
        bytes: sql<number>`coalesce(sum(${schema.transferJobs.transferredSize}), 0)`,
      })
      .from(schema.transferJobs)
      .where(gte(schema.transferJobs.createdAt, from))
      .groupBy(sql`date_trunc('day', ${schema.transferJobs.createdAt})`)
      .orderBy(sql`date_trunc('day', ${schema.transferJobs.createdAt})`),
    db
      .select({
        employeeName: schema.users.name,
        transfers: count(),
        bytes: sql<number>`coalesce(sum(${schema.transferJobs.transferredSize}), 0)`,
      })
      .from(schema.transferJobs)
      .leftJoin(schema.users, eq(schema.transferJobs.employeeId, schema.users.id))
      .where(
        and(gte(schema.transferJobs.createdAt, from), eq(schema.transferJobs.status, "COMPLETED")),
      )
      .groupBy(schema.users.name)
      .orderBy(desc(count())),
    db
      .select({
        deviceType: schema.transferDevices.deviceType,
        transfers: count(),
        bytes: sql<number>`coalesce(sum(${schema.transferJobs.transferredSize}), 0)`,
      })
      .from(schema.transferJobs)
      .leftJoin(
        schema.transferDevices,
        eq(schema.transferJobs.deviceId, schema.transferDevices.id),
      )
      .where(
        and(gte(schema.transferJobs.createdAt, from), eq(schema.transferJobs.status, "COMPLETED")),
      )
      .groupBy(schema.transferDevices.deviceType)
      .orderBy(desc(count())),
    db
      .select({
        sourcePath: schema.transferJobs.sourcePath,
        transfers: count(),
        bytes: sql<number>`coalesce(sum(${schema.transferJobs.transferredSize}), 0)`,
      })
      .from(schema.transferJobs)
      .where(
        and(gte(schema.transferJobs.createdAt, from), eq(schema.transferJobs.status, "COMPLETED")),
      )
      .groupBy(schema.transferJobs.sourcePath)
      .orderBy(desc(count()))
      .limit(6),
  ]);

  const total0 = totals[0];
  const completedCount = Number(total0?.completed ?? 0);

  return {
    period,
    totalTransfers: total0?.files ?? 0,
    totalBytes: Number(total0?.bytes ?? 0),
    completed: completedCount,
    failed: Number(total0?.failed ?? 0),
    cancelled: Number(total0?.cancelled ?? 0),
    averageSize: completedCount > 0 ? Number(total0?.bytes ?? 0) / completedCount : 0,
    averageSpeed: Number(total0?.averageSpeed ?? 0),
    breakdown: breakdown.map((row) => ({
      day: row.day,
      transfers: row.transfers,
      bytes: Number(row.bytes ?? 0),
    })),
    employeeStats: employeeStats.map((row) => ({
      employeeName: row.employeeName,
      transfers: row.transfers,
      bytes: Number(row.bytes ?? 0),
    })),
    deviceTypeStats: deviceTypeStats.map((row) => ({
      deviceType: row.deviceType ?? "UNKNOWN",
      transfers: row.transfers,
      bytes: Number(row.bytes ?? 0),
    })),
    topFolders: topFolders.map((row) => ({
      sourcePath: row.sourcePath,
      transfers: row.transfers,
      bytes: Number(row.bytes ?? 0),
    })),
  };
}

export async function getAuditLogs(limit = 100) {
  const rows = await db
    .select({
      id: schema.auditLog.id,
      action: schema.auditLog.action,
      ipAddress: schema.auditLog.ipAddress,
      metadata: schema.auditLog.metadata,
      createdAt: schema.auditLog.createdAt,
      userId: schema.auditLog.userId,
      userName: schema.users.name,
    })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(Math.min(limit, 500));
  return rows;
}

export async function getNasListing(shareId: string, path: string) {
  const [row] = await db
    .select()
    .from(schema.nasListing)
    .where(and(eq(schema.nasListing.shareId, shareId), eq(schema.nasListing.path, path)));
  return row ?? null;
}

export async function upsertNasListing(
  shareId: string,
  path: string,
  entries: { name: string; isDir: boolean }[],
): Promise<void> {
  const existing = await getNasListing(shareId, path);
  if (existing) {
    await db
      .update(schema.nasListing)
      .set({ entries, updatedAt: new Date() })
      .where(eq(schema.nasListing.id, existing.id));
  } else {
    await db.insert(schema.nasListing).values({ shareId, path, entries });
  }
}

