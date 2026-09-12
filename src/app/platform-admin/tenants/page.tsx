import { prisma } from "@/core/db/client";
import { TenantActions, TenantRowActions } from "./tenant-actions";

export default async function TenantsPage() {
  const tenants = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      templateCode: true,
      createdAt: true,
      plan: { select: { code: true, nameEn: true } },
      members: { where: { role: "owner" }, select: { userId: true }, take: 1 },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tenants</h1>
      </div>

      <TenantActions />

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Template</th>
              <th className="px-4 py-2 font-medium">Members</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {tenants.map((t) => (
              <tr key={t.id} className="bg-neutral-950">
                <td className="px-4 py-2">{t.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      t.status === "active"
                        ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        : "rounded-full bg-red-900/60 px-2 py-0.5 text-xs text-red-300"
                    }
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-2">{t.plan?.nameEn ?? "—"}</td>
                <td className="px-4 py-2">{t.templateCode ?? "—"}</td>
                <td className="px-4 py-2">{t._count.members}</td>
                <td className="px-4 py-2">
                  <TenantRowActions
                    tenantId={t.id}
                    status={t.status}
                    ownerUserId={t.members[0]?.userId ?? null}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
