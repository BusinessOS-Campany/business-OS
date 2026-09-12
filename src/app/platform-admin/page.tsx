import { prisma } from "@/core/db/client";

export default async function PlatformOverviewPage() {
  const [totalTenants, activeTenants, suspendedTenants, totalUsers] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { status: "active" } }),
    prisma.organization.count({ where: { status: { in: ["suspended", "cancelled"] } } }),
    prisma.user.count(),
  ]);

  const stats = [
    { label: "Tenants", value: totalTenants },
    { label: "Active", value: activeTenants },
    { label: "Suspended", value: suspendedTenants },
    { label: "Users", value: totalUsers },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Platform overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-400">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
