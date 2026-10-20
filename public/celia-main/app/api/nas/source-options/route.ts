import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { enumerateServerSources } from "@/lib/transfers/nas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const host = (url.searchParams.get("host") ?? "").trim();
  if (!host || /[\s\\/]/.test(host)) {
    return NextResponse.json({ error: "INVALID_HOST" }, { status: 400 });
  }

  try {
    const options = await enumerateServerSources(host);
    return NextResponse.json({ host, options });
  } catch (error) {
    logger.error("source options failed", { host, error });
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "NETVIEW_FAILED" ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
