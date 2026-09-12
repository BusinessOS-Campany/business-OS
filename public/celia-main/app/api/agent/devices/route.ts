import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAgent } from "@/lib/transfers/agent-auth";
import { DEVICE_TYPES } from "@/lib/transfers/constants";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export interface DeviceReport {
  deviceId: string;
  deviceName?: string | null;
  deviceLabel?: string | null;
  deviceType?: string;
  removable?: boolean;
  driveLetter?: string | null;
  filesystem?: string | null;
  totalCapacity?: number | null;
  freeSpace?: number | null;
  serialNumber?: string | null;
}

export async function POST(request: Request) {
  const agent = await requireAgent(request);
  if (!agent) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { devices?: DeviceReport[] } | null;
  const devices = Array.isArray(body?.devices) ? body.devices : [];
  const now = new Date();

  try {
    const existingRows = await db
      .select({ deviceId: schema.transferDevices.deviceId })
      .from(schema.transferDevices)
      .where(eq(schema.transferDevices.agentId, agent.agentId));
    const existingDeviceIds = new Set(existingRows.map((row) => row.deviceId));

    for (const device of devices) {
      if (!device.deviceId) continue;
      const deviceType =
        device.deviceType && (DEVICE_TYPES as readonly string[]).includes(device.deviceType)
          ? device.deviceType
          : "UNKNOWN";
      const values = {
        deviceId: device.deviceId,
        deviceName: device.deviceName ?? null,
        deviceLabel: device.deviceLabel ?? null,
        deviceType,
        driveLetter: device.driveLetter ?? null,
        filesystem: device.filesystem ?? null,
        totalCapacity: device.totalCapacity ?? null,
        freeSpace: device.freeSpace ?? null,
        serialNumber: device.serialNumber ?? null,
        connected: true,
        lastSeenAt: now,
        updatedAt: now,
      };
      await db
        .insert(schema.transferDevices)
        .values({ agentId: agent.agentId, ...values })
        .onConflictDoUpdate({
          target: [schema.transferDevices.agentId, schema.transferDevices.deviceId],
          set: values,
        })
        .returning({ id: schema.transferDevices.id, deviceId: schema.transferDevices.deviceId });
    }

    const newDevices = devices.filter((device) => !existingDeviceIds.has(device.deviceId));
    for (const device of newDevices) {
      await createNotification({
        type: "device",
        action: "add",
        messageKey: "notifications.deviceAdded",
        messageParams: { name: device.deviceName ?? device.deviceId },
        actorName: agent.name,
      });
    }

    const reported = new Set(devices.map((device) => device.deviceId));
    const existing = await db
      .select({ id: schema.transferDevices.id, deviceId: schema.transferDevices.deviceId })
      .from(schema.transferDevices)
      .where(eq(schema.transferDevices.agentId, agent.agentId));
    const missing = existing
      .map((row) => row.deviceId)
      .filter((deviceId) => !reported.has(deviceId));
    if (missing.length > 0) {
      await db
        .update(schema.transferDevices)
        .set({ connected: false, updatedAt: now })
        .where(
          and(
            eq(schema.transferDevices.agentId, agent.agentId),
            or(...missing.map((deviceId) => eq(schema.transferDevices.deviceId, deviceId))),
          ),
        );
    }

    return NextResponse.json({
      ok: true,
      count: devices.length,
      devices: existing.map((row) => ({ id: row.id, deviceId: row.deviceId })),
    });
  } catch (error) {
    logger.error("agent devices upsert failed", { error });
    return NextResponse.json({ error: "DEVICES_FAILED" }, { status: 500 });
  }
}
