import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashAgentKey } from "@/lib/transfers/agent-auth";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface RegisterBody {
  agentId?: string;
  name?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  const agentId = body?.agentId?.trim();
  const name = body?.name?.trim();

  if (!agentId || agentId.length < 3 || agentId.length > 64 || !name) {
    return NextResponse.json({ error: "INVALID_REGISTRATION" }, { status: 400 });
  }

  try {
    const [existing] = await db
      .select()
      .from(schema.transferAgents)
      .where(eq(schema.transferAgents.agentId, agentId));

    if (existing) {
      if (existing.apiKeyHash) {
        return NextResponse.json({ error: "ALREADY_REGISTERED" }, { status: 409 });
      }
      const apiKey = randomBytes(32).toString("hex");
      await db
        .update(schema.transferAgents)
        .set({ apiKeyHash: hashAgentKey(apiKey), updatedAt: new Date() })
        .where(eq(schema.transferAgents.agentId, agentId));
      return NextResponse.json({ agentId, apiKey });
    }

    const apiKey = randomBytes(32).toString("hex");
    await db.insert(schema.transferAgents).values({
      agentId,
      name,
      apiKeyHash: hashAgentKey(apiKey),
      status: "ONLINE",
    });

    await createNotification({
      type: "agent",
      action: "register",
      messageKey: "notifications.agentRegistered",
      messageParams: { name },
    });

    logger.info("agent registered", { agentId, name });
    return NextResponse.json({ agentId, apiKey });
  } catch (error) {
    logger.error("agent register failed", { error });
    return NextResponse.json({ error: "REGISTER_FAILED" }, { status: 500 });
  }
}
