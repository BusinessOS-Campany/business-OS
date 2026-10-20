import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { toMinor, fromMinor } from "@/lib/money";
import { created, fail, forbidden, unauthorized, getIp, serverError, zodErrors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const OpenSchema = z.object({
  branchId: z.string().min(1),
  terminalId: z.string().optional().default(""),
  openingCash: z.number().min(0),
  note: z.string().max(255).default(""),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("register.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId, userId: session.user.id } };
}

export async function POST(request: Request) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = OpenSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({ where: { id: d.branchId, companyId: cred.companyId } });
      if (!branch) throw { code: "invalid_fields" };
      if (d.terminalId) {
        const term = await tx.terminal.findFirst({ where: { id: d.terminalId, companyId: cred.companyId } });
        if (!term) throw { code: "invalid_fields" };
      }

      const existing = await tx.registerSession.findFirst({
        where: { companyId: cred.companyId, userId: cred.userId, status: "OPEN" },
      });
      if (existing) throw { code: "already_open" };

      const openingCash = BigInt(toMinor(d.openingCash));
      const session = await tx.registerSession.create({
        data: {
          companyId: cred.companyId,
          branchId: branch.id,
          terminalId: d.terminalId || null,
          userId: cred.userId,
          openingCash,
          expectedCash: openingCash,
          status: "OPEN",
          note: d.note,
        },
      });

      if (openingCash > 0n) {
        await tx.cashMovement.create({
          data: {
            companyId: cred.companyId,
            branchId: branch.id,
            registerId: session.id,
            userId: cred.userId,
            type: "OPENING",
            amount: openingCash,
            note: `Register opened`,
          },
        });
      }

      await writeAudit(tx, {
        companyId: cred.companyId,
        userId: cred.userId,
        action: "OPEN",
        entity: "registerSession",
        entityId: session.id,
        ip: getIp(request),
        newValue: { branchId: branch.id, openingCash: Number(openingCash) },
      });

      return { id: session.id, openingCash: Number(openingCash) };
    });

    return created({ data: { id: result.id } });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e) {
      const code = (e as { code?: unknown }).code;
      if (code === "invalid_fields") return fail("invalid_fields", 400);
      if (code === "already_open") return fail("already_open", 400);
    }
    console.error("register open error", e);
    return serverError();
  }
}