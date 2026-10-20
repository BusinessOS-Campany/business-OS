"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { success, failure, type ActionResult } from "@/lib/result";
import { nextNumber } from "@/lib/services/numbering";
import type { EmployeeCategory, EmployeeStatus, EmploymentType, Gender } from "@prisma/client";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

const employeeSchema = z.object({
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  employeeType: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  specialtyId: z.string().optional(),
  branchId: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  nationalId: z.string().optional(),
  licenseNo: z.string().optional(),
  address: z.string().optional(),
  hireDate: z.string().optional(),
  employmentType: z.string().optional(),
  employeeStatus: z.string().optional(),
  baseSalary: z.string().optional(),
  note: z.string().optional(),
});

function parseEmployee(formData: FormData) {
  return employeeSchema.safeParse({
    nameAr: str(formData, "nameAr"),
    nameEn: str(formData, "nameEn"),
    employeeType: str(formData, "employeeType"),
    departmentId: str(formData, "departmentId"),
    positionId: str(formData, "positionId"),
    specialtyId: str(formData, "specialtyId"),
    branchId: str(formData, "branchId"),
    gender: str(formData, "gender"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    nationalId: str(formData, "nationalId"),
    licenseNo: str(formData, "licenseNo"),
    address: str(formData, "address"),
    hireDate: str(formData, "hireDate"),
    employmentType: str(formData, "employmentType"),
    employeeStatus: str(formData, "employeeStatus"),
    baseSalary: str(formData, "baseSalary"),
    note: str(formData, "note"),
  });
}

function toEmployeeData(d: z.infer<typeof employeeSchema>) {
  return {
    nameAr: d.nameAr!,
    nameEn: d.nameEn!,
    employeeType: (d.employeeType as EmployeeCategory) ?? "OTHER",
    departmentId: d.departmentId ?? null,
    positionId: d.positionId ?? null,
    specialtyId: d.specialtyId ?? null,
    branchId: d.branchId ?? null,
    gender: (d.gender as Gender) ?? null,
    phone: d.phone ?? null,
    email: d.email ?? null,
    nationalId: d.nationalId ?? null,
    licenseNo: d.licenseNo ?? null,
    address: d.address ?? null,
    hireDate: d.hireDate ? new Date(d.hireDate) : null,
    employmentType: (d.employmentType as EmploymentType) ?? "FULL_TIME",
    employeeStatus: (d.employeeStatus as EmployeeStatus) ?? "ACTIVE",
    baseSalary: d.baseSalary ?? null,
    note: d.note ?? null,
  };
}

export async function createEmployeeAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("employees");

  const parsed = parseEmployee(formData);
  if (!parsed.success) return failure("common.error");

  try {
    const employeeNo = await nextNumber("employee");
    const employee = await prisma.employee.create({
      data: { employeeNo, ...toEmployeeData(parsed.data) },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "employees",
      recordId: employee.id,
      description: employeeNo,
    });
    return success("common.saved", { id: employee.id });
  } catch (err) {
    console.error("createEmployeeAction failed", err);
    return failure("common.error");
  }
}

export async function updateEmployeeAction(
  employeeId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("employees");

  const parsed = parseEmployee(formData);
  if (!parsed.success) return failure("common.error");

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return failure("common.notFound");

    await prisma.employee.update({
      where: { id: employeeId },
      data: toEmployeeData(parsed.data),
    });

    await audit({
      userId: user.id,
      action: "update",
      module: "employees",
      recordId: employeeId,
      description: `${employee.employeeNo}`,
    });
    return success("common.updated", { id: employeeId });
  } catch (err) {
    console.error("updateEmployeeAction failed", err);
    return failure("common.error");
  }
}

export async function updateEmployeeStatusAction(
  employeeId: string,
  newStatus: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("employees");

  const valid = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"] as const;
  if (!valid.includes(newStatus as (typeof valid)[number])) return failure("common.error");

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return failure("common.notFound");

    const status = newStatus as EmployeeStatus;
    await prisma.employee.update({ where: { id: employeeId }, data: { employeeStatus: status } });

    await audit({
      userId: user.id,
      action: "update",
      module: "employees",
      recordId: employeeId,
      description: `${employee.employeeNo} → ${newStatus}`,
    });
    return success("common.updated");
  } catch (err) {
    console.error("updateEmployeeStatusAction failed", err);
    return failure("common.error");
  }
}

export async function addEmployeeDocumentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requirePermission("employees");

  const parsed = z
    .object({
      employeeId: z.string().min(1),
      title: z.string().min(1),
      fileName: z.string().optional(),
      url: z.string().min(1),
    })
    .safeParse({
      employeeId: str(formData, "employeeId"),
      title: str(formData, "title"),
      fileName: str(formData, "fileName"),
      url: str(formData, "url"),
    });

  if (!parsed.success) return failure("common.error");

  try {
    const employee = await prisma.employee.findUnique({ where: { id: parsed.data.employeeId } });
    if (!employee) return failure("common.notFound");

    const doc = await prisma.employeeDocument.create({
      data: {
        employeeId: parsed.data.employeeId,
        title: parsed.data.title,
        fileName: parsed.data.fileName ?? parsed.data.title,
        url: parsed.data.url,
      },
    });

    await audit({
      userId: user.id,
      action: "create",
      module: "employees",
      recordId: doc.id,
      description: `${employee.employeeNo} · ${doc.title}`,
    });
    return success("common.saved");
  } catch (err) {
    console.error("addEmployeeDocumentAction failed", err);
    return failure("common.error");
  }
}