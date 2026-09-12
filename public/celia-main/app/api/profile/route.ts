import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { getSession } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/users/profile";
import { getUserProfile } from "@/lib/users/queries";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getUserProfile(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({
      ...profile,
      createdAt: profile.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error("get profile failed", { error });
    return NextResponse.json({ error: "PROFILE_FETCH_FAILED" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.usersManagement.unauthorized }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.usersManagement.invalidData },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.newPassword) {
      const [account] = await db
        .select({ password: schema.accounts.password })
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.userId, session.user.id),
            eq(schema.accounts.providerId, "credential"),
          ),
        )
        .limit(1);

      if (!account?.password) {
        return NextResponse.json(
          { error: t.profilePage.wrongCurrentPassword },
          { status: 400 },
        );
      }

      const valid = await verifyPassword({
        hash: account.password,
        password: parsed.data.currentPassword,
      });
      if (!valid) {
        return NextResponse.json(
          { error: t.profilePage.wrongCurrentPassword },
          { status: 400 },
        );
      }

      const passwordHash = await hashPassword(parsed.data.newPassword);
      await db
        .update(schema.accounts)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(
          and(
            eq(schema.accounts.userId, session.user.id),
            eq(schema.accounts.providerId, "credential"),
          ),
        );
    }

    await db
      .update(schema.users)
      .set({ name: parsed.data.name, phone: parsed.data.phone, updatedAt: new Date() })
      .where(eq(schema.users.id, session.user.id));

    const profile = await getUserProfile(session.user.id);

    return NextResponse.json({
      success: true,
      message: t.profilePage.profileUpdated,
      profile: profile
        ? { ...profile, createdAt: profile.createdAt.toISOString() }
        : null,
    });
  } catch (error) {
    logger.error("profile update failed", { error });
    return NextResponse.json({ error: t.usersManagement.serverError }, { status: 500 });
  }
}
