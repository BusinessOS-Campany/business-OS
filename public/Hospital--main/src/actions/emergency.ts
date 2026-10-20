"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import type { TriageLevel } from "@prisma/client";

const TRIAGES = ["RESUSCITATION", "EMERGENT", "URGENT", "LESS_URGENT", "NON_URGENT"] as const;

export async function setTriageAction(
  encounterId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("emergency");
  const raw = formData.get("triageLevel");
  const triageLevel = typeof raw === "string" && (TRIAGES as readonly string[]).includes(raw) ? (raw as TriageLevel) : null;
  if (!triageLevel) return failure("common.error");

  try {
    const enc = await prisma.encounter.findUnique({ where: { id: encounterId }, include: { patient: true } });
    if (!enc) return failure("common.notFound");

    await prisma.encounter.update({ where: { id: encounterId }, data: { triageLevel } });
    await audit({
      userId: user.id,
      action: "update",
      module: "emergency",
      recordId: encounterId,
      description: `${enc.encounterNo} triage → ${triageLevel}`,
    });
    return success("common.updated");
  } catch (err) {
    console.error("setTriageAction failed", err);
    return failure("common.error");
  }
}