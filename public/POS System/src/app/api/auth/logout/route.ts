import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api";
import { SESSION_COOKIE } from "@/server/session";

export async function POST() {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) {
      await prisma.session.updateMany({ where: { token }, data: { active: false } });
    }
    store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return ok({ signedOut: true });
  } catch (e) {
    console.error("logout error", e);
    return serverError();
  }
}