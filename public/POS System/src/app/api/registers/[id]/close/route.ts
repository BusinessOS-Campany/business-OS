import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { toMinor, fromMinor } from "@/lib/money";
import { ok, fail, forbidden, notFound, unauthorized, getIp, serverError, zodErrors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const CloseSchema = z.object({
  actualCash: z.number().min(0),
  note: z.string().max(255).default(""),
});

const CASH_IN = new Set(["SALE", "OPENING", "DEPOSIT"]);
const CASH_OUT = new Set(["PURCHASE", "EXPENSE", "REFUND", "WITHDRAWAL"]);

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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = CloseSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.registerSession.findFirst({ where: { id, companyId: cred.companyId } });
      if (!session) throw { code: "not_found" };
      if (session.status !== "OPEN") throw { code: "not_open" };

      const movements = await tx.cashMovement.findMany({
        where: { companyId: cred.companyId, branchId: session.branchId, createdAt: { gte: session.openedAt } },
        select: { type: true, amount: true, registerId: true },
      });

      let flow = session.openingCash;
      for (const m of movements) {
        const isSelf = m.registerId === session.id;
        const type = m.type;
        if (isSelf) {
          if (type === "CLOSE" || type === "OPENING") continue;
          flow += m.amount;
          continue;
        }
        if (CASH_IN.has(type)) flow += m.amount;
        else if (CASH_OUT.has(type)) flow -= m.amount;
      }

      const expectedCash = flow < 0n ? 0n : flow;
      const actualCash = BigInt(toMinor(d.actualCash));
      const difference = actualCash - expectedCash;

      const closed = await tx.registerSession.update({
        where: { id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedById: cred.userId,
          expectedCash,
          actualCash,
          difference,
          note: d.note,
        },
      });

      await tx.cashMovement.create({
        data: {
          companyId: cred.companyId,
          branchId: session.branchId,
          registerId: session.id,
          userId: cred.userId,
          type: "CLOSE",
          amount: actualCash,
          note: `Register closed (difference ${fromMinor(Number(difference)).toFixed(2)})`,
        },
      });

      await writeAudit(tx, {
        companyId: cred.companyId,
        userId: cred.userId,
        action: "CLOSE",
        entity: "registerSession",
        entityId: session.id,
        ip: getIp(request),
        oldValue: { status: "OPEN" },
        newValue: {
          status: "CLOSED",
          expectedCash: Number(expectedCash),
          actualCash: Number(actualCash),
          difference: Number(difference),
        },
      });

      return {
        id: closed.id,
        expectedCash: Number(expectedCash),
        actualCash: Number(actualCash),
        difference: Number(difference),
      };
    });

    return ok({ data: result });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e) {
      const code = (e as { code?: unknown }).code;
      if (code === "not_found") return notFound();
      if (code === "not_open") return fail("not_open", 400);
    }
    console.error("register close error", e);
    return serverError();
  }
}