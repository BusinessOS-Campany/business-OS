import { isGoogleEnabled } from "@/lib/auth";

export async function GET() {
  return Response.json({ googleEnabled: isGoogleEnabled() });
}
