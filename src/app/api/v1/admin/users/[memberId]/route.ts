import { z } from "zod";
import { ApiError, ok, withRoute } from "@/core/http/api";
import { requireTenantContext } from "@/core/tenancy/context";
import { requirePermission, tenantFilter } from "@/core/db/tenant-guard";
import { prisma } from "@/core/db/client";
import { writeAuditLog } from "@/core/audit/service";

type Ctx = { params: Promise<{ memberId: string }> };

const patchSchema = z.object({ role: z.enum(["owner", "admin", "manager", "cashier", "accountant", "viewer"]) });

export const PATCH = withRoute("v1.admin.users.role", async (request, ctx: Ctx) => {
  const { tenant } = await requireTenantContext(request);
  requirePermission(tenant, { roles: ["manage"] });
  const { memberId } = await ctx.params;
  const body = patchSchema.parse(await request.json().catch(() => null));

  if (tenant.role !== "owner" && body.role === "owner") {
    throw ApiError.forbidden("Only an owner can grant the owner role");
  }

  const member = await prisma.member.findFirst({
    where: tenantFilter(tenant, { id: memberId }),
  });
  if (!member) throw ApiError.notFound();

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.member.update({ where: { id: member.id }, data: { role: body.role } });
    await writeAuditLog(tx, tenant, {
      action: "member.role_changed",
      entityType: "member",
      entityId: m.id,
      before: { role: member.role },
      after: { role: m.role },
    });
    return m;
  });
  return ok({ member: { id: updated.id, role: updated.role } });
});

export const DELETE = withRoute("v1.admin.users.remove", async (request, ctx: Ctx) => {
  const { tenant } = await requireTenantContext(request);
  requirePermission(tenant, { users: ["remove"] });
  const { memberId } = await ctx.params;

  const member = await prisma.member.findFirst({
    where: tenantFilter(tenant, { id: memberId }),
    include: { user: { select: { email: true } } },
  });
  if (!member) throw ApiError.notFound();
  if (member.role === "owner") {
    const owners = await prisma.member.count({
      where: { organizationId: tenant.organizationId, role: "owner" },
    });
    if (owners <= 1) throw ApiError.conflict("Cannot remove the last owner");
  }

  await prisma.$transaction(async (tx) => {
    await tx.member.delete({ where: { id: member.id } });
    await writeAuditLog(tx, tenant, {
      action: "member.removed",
      entityType: "member",
      entityId: member.id,
      before: { email: member.user.email, role: member.role },
    });
  });
  return ok({ removed: true });
});
