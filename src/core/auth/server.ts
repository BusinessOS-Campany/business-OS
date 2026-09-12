import { betterAuth } from "better-auth";
import { organization, admin } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { getEnv } from "@/core/config/env";
import { prisma } from "@/core/db/client";
import { logger } from "@/core/logging/logger";
import { ac, tenantRoles } from "@/core/permissions/catalog";

export const auth = betterAuth({
  secret: getEnv().AUTH_SECRET,
  baseURL: getEnv().AUTH_URL ?? getEnv().NEXT_PUBLIC_APP_URL,
  trustedOrigins: [getEnv().NEXT_PUBLIC_APP_URL],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    google: {
      clientId: getEnv().GOOGLE_CLIENT_ID!,
      clientSecret: getEnv().GOOGLE_CLIENT_SECRET!,
    },
    facebook: {
      clientId: getEnv().FACEBOOK_CLIENT_ID!,
      clientSecret: getEnv().FACEBOOK_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once a day
  },
  advanced: {
    cookiePrefix: "bos",
  },
  plugins: [
    admin({
      // Platform realm: user.role === "admin" gates /platform-admin + /api/platform.
      // Impersonation endpoints ship enabled; UI + audit wiring land with the console.
    }),
    organization({
      ac,
      roles: tenantRoles,
      organizationCreation: {
        // The creator becomes owner (plugin default); seed default settings here later (M3).
        afterCreateOrganization: async (data: {
          org: { id: string; slug: string };
          member: { id: string };
        }) => {
          logger.info(
            { orgId: data.org.id, slug: data.org.slug, memberId: data.member.id },
            "[tenancy] organization created",
          );
        },
      },
    }),
    // MUST stay last — forwards Set-Cookie into Next's cookie store.
    nextCookies(),
  ],
  onApiError: (error: unknown) => {
    logger.error({ err: error }, "[auth] api error");
  },
});
