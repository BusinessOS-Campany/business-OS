"use server";

import bcrypt from "bcryptjs";
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

export async function createUserAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requirePermission("users", "create");
  const parsed = z
    .object({
      email: z.string().email(),
      username: z.string().min(3).optional(),
      password: z.string().min(6),
      nameAr: z.string().optional(),
      nameEn: z.string().optional(),
      phone: z.string().optional(),
      roleId: z.string().min(1),
      branchId: z.string().optional(),
      employeeId: z.string().optional(),
    })
    .safeParse({
      email: str(formData, "email"),
      username: str(formData, "username"),
      password: str(formData, "password"),
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      phone: str(formData, "phone"),
      roleId: str(formData, "roleId"),
      branchId: str(formData, "branchId"),
      employeeId: str(formData, "employeeId"),
    });
  if (!parsed.success) return failure("errors.formError");

  const { email, username, password, nameAr, nameEn, phone, roleId, branchId, employeeId } = parsed.data;

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(username ? [{ username }] : [])] },
      select: { id: true },
    });
    if (existing) return failure("common.error");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username: username ?? null,
        passwordHash,
        nameAr: nameAr ?? null,
        nameEn: nameEn ?? null,
        phone: phone ?? null,
        roleId,
        branchId: branchId ?? null,
        employeeId: employeeId ?? null,
      },
    });
    await audit({ userId: actor.id, action: "create", module: "users", recordId: user.id, description: email });
    revalidatePath("/admin/users");
    return success("common.created");
  } catch (err) {
    console.error("createUserAction failed", err);
    return failure("common.error");
  }
}

export async function updateUserAction(
  userId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requirePermission("users", "edit");
  const parsed = z
    .object({
      nameAr: z.string().optional(),
      nameEn: z.string().optional(),
      phone: z.string().optional(),
      roleId: z.string().min(1),
      branchId: z.string().optional(),
    })
    .safeParse({
      nameAr: str(formData, "nameAr"),
      nameEn: str(formData, "nameEn"),
      phone: str(formData, "phone"),
      roleId: str(formData, "roleId"),
      branchId: str(formData, "branchId"),
    });
  if (!parsed.success) return failure("errors.formError");

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        nameAr: parsed.data.nameAr ?? null,
        nameEn: parsed.data.nameEn ?? null,
        phone: parsed.data.phone ?? null,
        roleId: parsed.data.roleId,
        branchId: parsed.data.branchId ?? null,
      },
    });
    await audit({ userId: actor.id, action: "update", module: "users", recordId: userId });
    revalidatePath("/admin/users");
    return success("common.updated");
  } catch (err) {
    console.error("updateUserAction failed", err);
    return failure("common.error");
  }
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<ActionResult> {
  const actor = await requirePermission("users", "edit");
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive, userStatus: isActive ? "ACTIVE" : "INACTIVE" },
    });
    await audit({ userId: actor.id, action: isActive ? "activate" : "deactivate", module: "users", recordId: userId });
    revalidatePath("/admin/users");
    return success("common.updated");
  } catch (err) {
    console.error("setUserActiveAction failed", err);
    return failure("common.error");
  }
}

export async function resetUserPasswordAction(
  userId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requirePermission("users", "edit");
  const password = str(formData, "password");
  if (!password || password.length < 6) return failure("errors.formError");
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
    });
    await audit({ userId: actor.id, action: "update", module: "users", recordId: userId, description: "password reset" });
    return success("common.updated");
  } catch (err) {
    console.error("resetUserPasswordAction failed", err);
    return failure("common.error");
  }
}

export async function updateRolePermissionsAction(
  roleId: string,
  permissionIds: string[]
): Promise<ActionResult> {
  const actor = await requirePermission("roles", "edit");
  try {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return failure("common.notFound");
    if (role.isSystem) return failure("common.unauthorized");

    const valid = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({
        data: valid.map((p) => ({ roleId, permissionId: p.id })),
      }),
    ]);

    await audit({ userId: actor.id, action: "update", module: "roles", recordId: roleId, description: "permissions updated" });
    revalidatePath(`/admin/roles/${roleId}`);
    revalidatePath("/admin/roles");
    return success("admin.permissionsSaved");
  } catch (err) {
    console.error("updateRolePermissionsAction failed", err);
    return failure("common.error");
  }
}
