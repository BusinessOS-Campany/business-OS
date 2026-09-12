import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { auth } from "@/core/auth/server";
import { prisma } from "@/core/db/client";
import { getTemplate } from "@/core/platform/templates/grocery";
import { writeAuditLog } from "@/core/audit/service";

/** Maps template codes to app slugs (mirrors the email-signup route). */
const TEMPLATE_APP_MAP: Record<string, string> = {
  grocery: "grocery",
  clinic: "sama-center",
};

interface PageProps {
  searchParams: Promise<{ template?: string }>;
}

/**
 * Landing page for the social-login callback (Google/Facebook signup).
 *
 * After a fresh social signup the user has no organization yet. This page
 * silently auto-provisions one from the chosen template (default org name from
 * the user's name/email) and installs the matching app, then forwards them to
 * /select-org. Users who already belong to an org skip straight through.
 */
export default async function CompleteOrgPage({ searchParams }: PageProps) {
  const { template: rawTemplate } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.session) redirect("/signin");

  const user = session.user;
  const template = getTemplate(rawTemplate);

  // Already has an org → nothing to provision, straight to selection.
  const existingMember = await prisma.member.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existingMember) redirect("/select-org");

  // No org → auto-create from the template (or a generic default).
  const defaultSlug = slugify(user.name || "my-business");
  const baseSlug = template ? `${template.code}-${defaultSlug}` : defaultSlug;
  const uniqueSlug = await ensureUniqueSlug(baseSlug);

  const orgName = template
    ? (template.nameAr || "أنشطة تجارية")
    : user.name || "أنشطة تجارية";

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        id: randomUUID(),
        name: orgName,
        slug: uniqueSlug,
        status: "active",
        templateCode: template?.code ?? null,
        settings: (template?.settings ?? {}) as never,
      },
    });

    await tx.member.create({
      data: { id: randomUUID(), organizationId: org.id, userId: user.id, role: "owner" },
    });

    if (template) {
      const appSlug = TEMPLATE_APP_MAP[template.code];
      if (appSlug) {
        const app = await tx.app.findUnique({ where: { slug: appSlug } });
        if (app) {
          await tx.organizationApp.create({
            data: {
              id: randomUUID(),
              organizationId: org.id,
              appId: app.id,
              status: "active",
              version: app.version,
              activatedAt: new Date(),
            },
          });
        }
      }
    }

    await writeAuditLog(tx, { organizationId: org.id, userId: user.id }, {
      action: "platform.tenant.created",
      entityType: "organization",
      entityId: org.id,
      after: {
        name: org.name,
        slug: org.slug,
        planCode: "trial",
        ownerEmail: user.email,
        templateCode: template?.code ?? null,
        installedApp: template ? TEMPLATE_APP_MAP[template.code] ?? null : null,
        source: "social-signup",
      },
    });
  });

  redirect("/select-org");
}

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return s || "business";
}

async function ensureUniqueSlug(base: string): Promise<string> {
  const existing = await prisma.organization.findFirst({ where: { slug: base } });
  if (!existing) return base;
  return `${base}-${Date.now().toString(36)}`;
}
