"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function num(formData: FormData, key: string): number {
  const v = str(formData, key);
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function createPayrollPeriodAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("payroll");
  const parsed = z
    .object({
      nameAr: z.string().min(1),
      nameEn: z.string().min(1),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
    })
    .safeParse({
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      startDate: str(formData, "startDate"),
      endDate: str(formData, "endDate"),
    });
  if (!parsed.success) return failure("common.error");

  try {
    const period = await prisma.payrollPeriod.create({
      data: {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      },
    });
    await audit({ userId: user.id, action: "create", module: "payroll", recordId: period.id, description: period.nameEn });
    revalidatePath("/payroll");
    return success("common.saved", { id: period.id });
  } catch (err) {
    console.error("createPayrollPeriodAction failed", err);
    return failure("common.error");
  }
}

export async function generatePayrollRunAction(periodId: string): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("payroll");
  try {
    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) return failure("common.notFound");

    const employees = await prisma.employee.findMany({
      where: { employeeStatus: "ACTIVE", baseSalary: { not: null } },
      select: { id: true, baseSalary: true },
    });
    if (employees.length === 0) return failure("common.error");

    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollRun.create({ data: { periodId } });
      await tx.payrollLine.createMany({
        data: employees.map((e) => {
          const base = Number(e.baseSalary ?? 0);
          return {
            payrollRunId: created.id,
            employeeId: e.id,
            baseSalary: base,
            net: base,
          };
        }),
      });
      return created;
    });

    await audit({ userId: user.id, action: "create", module: "payroll", recordId: run.id, description: `run ${period.nameEn}` });
    revalidatePath(`/payroll/${periodId}`);
    revalidatePath("/payroll");
    return success("common.saved", { id: run.id });
  } catch (err) {
    console.error("generatePayrollRunAction failed", err);
    return failure("common.error");
  }
}

export async function approvePayrollRunAction(runId: string): Promise<ActionResult> {
  const user = await requirePermission("payroll");
  try {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) return failure("common.notFound");
    if (run.status !== "DRAFT") return failure("common.error");
    await prisma.payrollRun.update({
      where: { id: runId },
      data: { status: "APPROVED", approvedById: user.id },
    });
    await audit({ userId: user.id, action: "approve", module: "payroll", recordId: runId });
    revalidatePath(`/payroll/runs/${runId}`);
    revalidatePath("/payroll");
    return success("common.updated");
  } catch (err) {
    console.error("approvePayrollRunAction failed", err);
    return failure("common.error");
  }
}

export async function markPayrollRunPaidAction(runId: string): Promise<ActionResult> {
  const user = await requirePermission("payroll");
  try {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) return failure("common.notFound");
    if (run.status !== "APPROVED") return failure("common.error");
    await prisma.payrollRun.update({
      where: { id: runId },
      data: { status: "PAID", paidAt: new Date() },
    });
    await audit({ userId: user.id, action: "update", module: "payroll", recordId: runId, description: "marked paid" });
    revalidatePath(`/payroll/runs/${runId}`);
    revalidatePath("/payroll");
    return success("common.updated");
  } catch (err) {
    console.error("markPayrollRunPaidAction failed", err);
    return failure("common.error");
  }
}

export async function updatePayrollLineAction(
  lineId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("payroll");
  try {
    const line = await prisma.payrollLine.findUnique({ where: { id: lineId } });
    if (!line) return failure("common.notFound");

    const baseSalary = Number(line.baseSalary);
    const allowances = num(formData, "allowances");
    const deductions = num(formData, "deductions");
    const overtime = num(formData, "overtime");
    const bonuses = num(formData, "bonuses");
    const advances = num(formData, "advances");
    const loans = num(formData, "loans");
    const net = baseSalary + allowances + overtime + bonuses - deductions - advances - loans;

    await prisma.payrollLine.update({
      where: { id: lineId },
      data: {
        allowances,
        deductions,
        overtime,
        bonuses,
        advances,
        loans,
        net,
        note: str(formData, "note"),
      },
    });
    await audit({ userId: user.id, action: "update", module: "payroll", recordId: lineId });
    revalidatePath(`/payroll/runs/${line.payrollRunId}`);
    return success("common.updated");
  } catch (err) {
    console.error("updatePayrollLineAction failed", err);
    return failure("common.error");
  }
}
