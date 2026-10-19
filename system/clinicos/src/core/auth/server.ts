import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

/**
 * The cookie this system issues its session under.
 *
 * The platform's runtime proxy reads this exact name out of the `Set-Cookie`
 * that `/api/bos/link` returns, so it can replay the session on later requests.
 * It is declared here — rather than left as Better Auth's default
 * `better-auth.session_token` — because the platform discovers a system's
 * cookie name from a `SESSION_COOKIE = "…"` declaration, which cannot express a
 * name containing a dot.
 */
export const SESSION_COOKIE = "clinicos_session";

/**
 * Always `/api/auth`, never mount-prefixed.
 *
 * Next compiles `basePath` into the build and strips it from the path before a
 * route handler ever sees the request, so the handler at
 * `<mount>/api/auth/[...all]` is handed `/api/auth/...`. Telling Better Auth to
 * expect the mount as well (`<mount>/api/auth`) makes every auth request 404.
 * The browser-facing mount is handled by the client (`core/auth/client.ts`).
 */
const basePath = "/api/auth";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  basePath,
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    cookies: {
      session_token: { name: SESSION_COOKIE },
    },
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 5,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      roleId: {
        type: "string",
        required: true,
        defaultValue: "",
      },
      nameAr: {
        type: "string",
        required: false,
      },
      nameEn: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      clinicId: {
        type: "string",
        required: false,
      },
      currentClinicId: {
        type: "string",
        required: false,
      },
    },
  },
  plugins: [
    username({
      displayUsername: false,
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
});