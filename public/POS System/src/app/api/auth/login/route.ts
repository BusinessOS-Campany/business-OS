import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, unauthorized, serverError, getIp } from "@/lib/api";
import { verifyPassword } from "@/server/auth";
import { createSession } from "@/server/session";
import { SESSION_COOKIE } from "@/server/session";

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return fail("invalid_credentials", 400);
    }
    const { identifier, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: {
        company: { select: { id: true, name: true, nameAr: true, nameEn: true, slug: true, status: true } },
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    if (!user || user.status === "SUSPENDED") {
      return unauthorized("invalid_credentials");
    }
    if (user.status === "INACTIVE" && !user.isSuperAdmin) {
      return fail("account_suspended", 403);
    }
    if (user.company && user.company.status !== "ACTIVE" && user.company.status !== "TRIAL") {
      return fail("account_suspended", 403);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return unauthorized("invalid_credentials");
    }

    const token = await createSession(user.id, getIp(request), request.headers.get("user-agent") ?? "");

    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    const permissions = new Set<string>();
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
    }

    return ok({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        language: user.language,
        theme: user.theme,
        phone: user.phone,
        avatar: user.avatar,
        isSuperAdmin: user.isSuperAdmin,
        companyId: user.companyId,
        branchId: user.branchId,
        terminalId: user.terminalId,
      },
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name,
            nameAr: user.company.nameAr,
            nameEn: user.company.nameEn,
            slug: user.company.slug,
          }
        : null,
      permissions: [...permissions],
    });
  } catch (e) {
    console.error("login error", e);
    return serverError();
  }
}