import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export function hashAgentKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export interface AgentSession {
  agentId: string;
  name: string;
}

export async function requireAgent(request: Request): Promise<AgentSession | null> {
  const agentId = request.headers.get("x-agent-id");
  const apiKey = request.headers.get("x-agent-key");
  if (!agentId || !apiKey) return null;

  const [agent] = await db
    .select()
    .from(schema.transferAgents)
    .where(eq(schema.transferAgents.agentId, agentId));
  if (!agent?.apiKeyHash) return null;

  const candidate = Buffer.from(hashAgentKey(apiKey), "hex");
  const stored = Buffer.from(agent.apiKeyHash, "hex");
  if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) return null;

  return { agentId: agent.agentId, name: agent.name };
}
