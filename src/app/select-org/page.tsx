import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/core/auth/server";
import { prisma } from "@/core/db/client";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

export default async function SelectOrgPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const memberships = await prisma.member.findMany({
    where: { userId: session.user.id },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });

  return (
    <OnboardingShell>
      <main className="min-h-[calc(100vh-4rem)]" dir="rtl">
        <div className="mx-auto flex max-w-md flex-col justify-center gap-6 px-4 py-24">
          <h1 className="text-xl font-semibold text-white">اختر المؤسسة</h1>
          {memberships.length === 0 && (
            <p className="text-white/60">ليس لديك أي مؤسسات بعد. يمكنك إنشاء مؤسسة جديدة من لوحة التحكم.</p>
          )}
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <ActivateRow
                  orgId={m.organizationId}
                  name={m.organization.name}
                  slug={m.organization.slug}
                  role={m.role}
                />
              </li>
            ))}
          </ul>
          {session.user.role === "admin" && (
            <a href="/platform-admin" className="text-sm text-primary hover:text-primary/80">
              ← لوحة تحكم المنصة
            </a>
          )}
          <Link href="/" className="text-sm text-white/60 hover:text-white">
            العودة
          </Link>
        </div>
      </main>
    </OnboardingShell>
  );
}

function ActivateRow({
  orgId,
  name,
  slug,
  role,
}: {
  orgId: string;
  name: string;
  slug: string;
  role: string;
}) {
  const roleLabels: Record<string, string> = {
    owner: "المالك",
    admin: "مدير",
    manager: "مشرف",
    cashier: "محاسب",
    accountant: "محاسب",
    viewer: "مشاهد",
  };
  return (
    <form action="/api/v1/organizations/activate-form" method="post" className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-xl transition-all hover:border-primary/40">
      <input type="hidden" name="organizationId" value={orgId} />
      <div className="flex-1">
        <p className="font-medium text-white">{name}</p>
        <p className="text-xs text-white/50">{slug} · {roleLabels[role] ?? role}</p>
      </div>
      <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90">
        دخول ←
      </button>
    </form>
  );
}
