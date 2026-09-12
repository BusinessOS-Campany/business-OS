import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/core/auth/server";

const bodySchema = z.object({ organizationId: z.string().min(1) });

/**
 * Form-post friendly wrapper around setActiveOrganization for no-JS flows
 * (org picker). Redirects back to the tenant app on success.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const parsed = bodySchema.parse({ organizationId: form.get("organizationId") });
    const result = await auth.api.setActiveOrganization({
      body: { organizationId: parsed.organizationId },
      headers: request.headers,
      returnHeaders: true,
    });
    const response = NextResponse.redirect(new URL("/my-apps", request.url), { status: 303 });
    for (const cookie of result.headers.getSetCookie()) {
      response.headers.append("set-cookie", cookie);
    }
    return response;
  } catch {
    // Form-post flow: never leak JSON errors — send the user back to pick again.
    return NextResponse.redirect(new URL("/select-org?error=1", request.url), { status: 303 });
  }
}
