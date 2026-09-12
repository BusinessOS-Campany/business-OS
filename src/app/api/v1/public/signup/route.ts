import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, ok, withRoute } from "@/core/http/api";
import { getTemplate } from "@/core/platform/templates/grocery";
import { prisma } from "@/core/db/client";
import { auth } from "@/core/auth/server";
import { writeAuditLog } from "@/core/audit/service";

/** Maps template codes to app slugs that should be auto-installed. */
const TEMPLATE_APP_MAP: Record<string, string> = {
  grocery: "grocery",
  clinic: "sama-center",
};

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  organizationName: z.string().min(2).max(80),
  templateCode: z.string().nullable().optional(),
});

export const POST = withRoute("public.signup", async (request) => {
  const body = signupSchema.parse(await request.json().catch(() => null));

  const template = getTemplate(body.templateCode);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw ApiError.conflict("Email already registered");

  const slug = body.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const existingSlug = await prisma.organization.findFirst({ where: { slug } });
  const finalSlug = existingSlug ? `${slug}-${Date.now().toString(36)}` : slug;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const signupResult = await auth.api.signUpEmail({
        body: { email: body.email, password: body.password, name: body.name },
      });

      const userId = signupResult.user.id;

      const org = await tx.organization.create({
        data: {
          id: randomUUID(),
          name: body.organizationName,
          slug: finalSlug,
          status: "active",
          templateCode: template?.code ?? null,
          settings: template
            ? ({ ...template.settings, modulesEnabled: template.modules } as never)
            : { modulesEnabled: [] },
        },
      });

      await tx.member.create({
        data: { id: randomUUID(), organizationId: org.id, userId, role: "owner" },
      });

      // Auto-install the matching app for this template
      const appSlug = template ? TEMPLATE_APP_MAP[template.code] : undefined;
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

      await writeAuditLog(tx, { organizationId: org.id, userId }, {
        action: "platform.tenant.created",
        entityType: "organization",
        entityId: org.id,
        after: {
          name: org.name,
          slug: org.slug,
          planCode: "trial",
          ownerEmail: body.email,
          templateCode: template?.code ?? null,
          installedApp: appSlug ?? null,
        },
      });

      return { user: { id: userId, email: body.email }, org: { id: org.id, name: org.name, slug: finalSlug } };
    });

    return ok(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && /already/i.test(err.message)) {
      throw ApiError.conflict("Email already registered");
    }
    throw err;
  }
});
