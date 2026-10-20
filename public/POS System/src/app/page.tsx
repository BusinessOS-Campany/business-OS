import { redirect } from "next/navigation";
import { getSession } from "@/server/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.isSuperAdmin && !session.user.companyId) redirect("/portal");
  if (!session.user.companyId) redirect("/login");
  redirect("/dashboard");
}