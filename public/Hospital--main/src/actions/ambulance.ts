"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import { nextNumber } from "@/lib/services/numbering";
import type { AmbulanceStatus, Priority, TripStatus } from "@prisma/client";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function createAmbulanceAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("ambulance");

  const parsed = z
    .object({
      code: z.string().min(1),
      plateNo: z.string().min(1),
      model: z.string().optional(),
      capacity: z.coerce.number().int().min(0).default(1),
    })
    .safeParse({
      code: str(formData, "code"),
      plateNo: str(formData, "plateNo"),
      model: str(formData, "model"),
      capacity: Number(formData.get("capacity") ?? 1),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const existing = await prisma.ambulance.findUnique({ where: { code: parsed.data.code } });
    if (existing) return failure("ambulance.duplicateCode");

    await prisma.ambulance.create({ data: { ...parsed.data } });
    await audit({ userId: user.id, action: "create", module: "ambulance", recordId: "amb", description: parsed.data.code });
    return success("common.saved");
  } catch (err) {
    console.error("createAmbulanceAction failed", err);
    return failure("common.error");
  }
}

export async function dispatchTripAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("ambulance");

  const parsed = z
    .object({
      ambulanceId: z.string().min(1),
      driverId: z.string().optional(),
      patientId: z.string().optional(),
      patientName: z.string().optional(),
      pickupLocation: z.string().min(1),
      destination: z.string().optional(),
      priority: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse({
      ambulanceId: str(formData, "ambulanceId"),
      driverId: str(formData, "driverId"),
      patientId: str(formData, "patientId"),
      patientName: str(formData, "patientName"),
      pickupLocation: str(formData, "pickupLocation"),
      destination: str(formData, "destination"),
      priority: str(formData, "priority") ?? "EMERGENCY",
      note: str(formData, "note"),
    });

  if (!parsed.success) return failure("common.error");
  const priorities = ["ROUTINE", "URGENT", "EMERGENCY", "STAT"];
  if (!priorities.includes(parsed.data.priority ?? "EMERGENCY")) return failure("common.error");

  try {
    const amb = await prisma.ambulance.findUnique({ where: { id: parsed.data.ambulanceId } });
    if (!amb) return failure("common.notFound");
    if (amb.status !== "AVAILABLE") return failure("ambulance.notAvailable");

    const tripNo = await nextNumber("trip");
    const trip = await prisma.ambulanceTrip.create({
      data: {
        tripNo,
        ambulanceId: parsed.data.ambulanceId,
        driverId: parsed.data.driverId,
        patientId: parsed.data.patientId,
        patientName: parsed.data.patientName,
        pickupLocation: parsed.data.pickupLocation,
        destination: parsed.data.destination,
        priority: parsed.data.priority as Priority,
        note: parsed.data.note,
      },
    });

    await prisma.ambulance.update({ where: { id: parsed.data.ambulanceId }, data: { status: "DISPATCHED" } });
    await audit({ userId: user.id, action: "create", module: "ambulance", recordId: trip.id, description: tripNo });
    return success("common.saved", { id: trip.id });
  } catch (err) {
    console.error("dispatchTripAction failed", err);
    return failure("common.error");
  }
}

export async function updateTripStatusAction(
  tripId: string,
  newStatus: string,
  _prev: ActionResult | null
): Promise<ActionResult> {
  const user = await requirePermission("ambulance");

  const flow: Record<string, TripStatus> = {
    EN_ROUTE: "EN_ROUTE",
    ARRIVED: "ARRIVED",
    TRANSPORTING: "TRANSPORTING",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  };
  const target = flow[newStatus];
  if (!target) return failure("common.error");

  try {
    const trip = await prisma.ambulanceTrip.findUnique({ where: { id: tripId } });
    if (!trip) return failure("common.notFound");
    if (["COMPLETED", "CANCELLED"].includes(trip.status)) return failure("ambulance.tripClosed");

    const data: Record<string, unknown> = { status: target };
    if (target === "EN_ROUTE") data.transportingAt = null;
    if (target === "ARRIVED") data.arrivedAt = new Date();
    if (target === "TRANSPORTING") data.transportingAt = new Date();
    if (target === "COMPLETED") data.completedAt = new Date();
    if (target === "CANCELLED") data.cancelledAt = new Date();

    await prisma.ambulanceTrip.update({ where: { id: tripId }, data });

    const ambStatus: Record<string, AmbulanceStatus> = {
      COMPLETED: "AVAILABLE",
      CANCELLED: "AVAILABLE",
      TRANSPORTING: "TRANSPORTING",
      ARRIVED: "ARRIVED",
      EN_ROUTE: "EN_ROUTE",
    };
    if (ambStatus[target]) {
      await prisma.ambulance.update({ where: { id: trip.ambulanceId }, data: { status: ambStatus[target] } });
    }

    await audit({
      userId: user.id,
      action: target === "CANCELLED" ? "delete" : "update",
      module: "ambulance",
      recordId: tripId,
      description: `${trip.tripNo} → ${target}`,
    });
    return success("common.updated");
  } catch (err) {
    console.error("updateTripStatusAction failed", err);
    return failure("common.error");
  }
}