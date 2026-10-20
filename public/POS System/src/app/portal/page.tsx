import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ShieldCheck, Store, LogOut, Building2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await getSession();
  if (!session || !session.user.isSuperAdmin) redirect("/login");

  const companies = await prisma.company.findMany({
    select: {
      id: true, name: true, nameAr: true, nameEn: true, slug: true, status: true, createdAt: true,
      _count: { select: { branches: true, users: true, products: true, sales: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600",
    TRIAL: "bg-amber-500/10 text-amber-600",
    SUSPENDED: "bg-rose-500/10 text-rose-600",
    INACTIVE: "bg-slate-500/10 text-slate-600",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Super Admin Portal</p>
              <p className="text-xs text-muted-foreground">بوابة الإشراف العام</p>
            </div>
          </div>
          <Link href="/api/auth/logout" className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted/50">
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Companies · الشركات</h1>
            <p className="text-sm text-muted-foreground">{companies.length} tenant{companies.length === 1 ? "" : "s"} registered</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-end font-semibold">Branches</th>
                  <th className="px-4 py-3 text-end font-semibold">Users</th>
                  <th className="px-4 py-3 text-end font-semibold">Products</th>
                  <th className="px-4 py-3 text-end font-semibold">Sales</th>
                  <th className="px-4 py-3 text-end font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map((c) => (
                  <tr key={c.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-semibold">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        {c.nameAr || c.nameEn || c.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">/{c.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[c.status] ?? "bg-muted text-muted-foreground"}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-end">{c._count.branches}</td>
                    <td className="px-4 py-3 text-end">{c._count.users}</td>
                    <td className="px-4 py-3 text-end">{c._count.products}</td>
                    <td className="px-4 py-3 text-end">{c._count.sales}</td>
                    <td className="px-4 py-3 text-end text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}