import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { getAgents } from "@/lib/transfers/queries";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const agents = await getAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    logger.error("get agents failed", { error });
    return NextResponse.json(
      { error: "AGENTS_FETCH_FAILED" },
      { status: 500 },
    );
  }
}
