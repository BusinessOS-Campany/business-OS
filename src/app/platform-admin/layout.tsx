import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/core/auth/server";
import { SignOutButton } from "./sign-out-button";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");
  if (session.user.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/platform-admin" className="font-semibold">
              Business OS · Platform
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-400">
              <Link href="/platform-admin" className="hover:text-white">Overview</Link>
              <Link href="/platform-admin/tenants" className="hover:text-white">Tenants</Link>
              <Link href="/platform-admin/plans" className="hover:text-white">Plans</Link>
              <Link href="/platform-admin/announcements" className="hover:text-white">Announcements</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-400">
            <span>{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
