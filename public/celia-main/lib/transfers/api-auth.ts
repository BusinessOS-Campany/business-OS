import { getSession } from "@/lib/session";

export async function requireApiUser() {
  const session = await getSession();
  return session?.user ?? null;
}
