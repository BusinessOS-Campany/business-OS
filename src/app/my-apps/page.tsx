import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/core/auth/server";
import { prisma } from "@/core/db/client";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

const APP_ICONS: Record<string, string> = {
  grocery: "🛒",
  "sama-center": "🏥",
  restaurant: "🍽️",
  retail: "🏪",
  pharmacy: "💊",
  school: "🎓",
};

export default async function MyAppsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  // Get active organization from session
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) redirect("/select-org");

  // Get installed apps for this organization
  const installedApps = await prisma.organizationApp.findMany({
    where: {
      organizationId: activeOrgId,
      status: "active",
    },
    include: {
      app: true,
    },
    orderBy: { installedAt: "desc" },
  });

  // Get organization info
  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: { name: true, slug: true, logo: true },
  });

  return (
    <OnboardingShell>
      <main className="min-h-[calc(100vh-4rem)]" dir="rtl">
        <div className="mx-auto max-w-5xl px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-3">
              {org?.logo && (
                <img src={org.logo} alt="" className="h-10 w-10 rounded-lg object-cover" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{org?.name}</h1>
                <p className="text-sm text-white/50">{org?.slug}</p>
              </div>
            </div>
            <p className="mt-2 text-white/60">
              تطبيقاتك المثبتة — اختر تطبيقاً للبدء
            </p>
          </div>

          {/* Installed Apps Grid */}
          {installedApps.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {installedApps.map((ia) => {
                const app = ia.app;
                return (
                  <Link
                    key={ia.id}
                    href={app.routePrefix}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                  >
                    {/* Status indicator */}
                    <div className="absolute left-3 top-3">
                      <span className="flex h-2 w-2 rounded-full bg-primary" />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-4 text-4xl">
                        {APP_ICONS[app.slug] ?? "📦"}
                      </div>
                      <h2 className="text-xl font-semibold text-white">{app.nameAr ?? app.name}</h2>
                      {app.nameAr && (
                        <p className="text-sm text-white/50">{app.name}</p>
                      )}
                      <p className="mt-2 flex-1 text-sm text-white/60 line-clamp-2">
                        {app.descriptionAr ?? app.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-4">
                        <span className="text-xs text-white/50">
                          الإصدار {ia.version}
                        </span>
                        <span className="text-sm font-medium text-primary group-hover:text-primary/80 transition-colors">
                          فتح ←
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Browse More Apps Card */}
              <Link
                href="/systems"
                className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-6 backdrop-blur-xl transition-all hover:border-primary/50 hover:bg-white/[0.04]"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03] text-2xl text-white/60">
                  +
                </div>
                <p className="font-medium text-white">إضافة نظام جديد</p>
                <p className="text-sm text-white/60">اختر وتثبيت أنظمة إضافية</p>
              </Link>
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] py-16 backdrop-blur-xl">
              <div className="mb-4 text-5xl">🚀</div>
              <h2 className="text-xl font-semibold text-white">لم تثبّت أي تطبيق بعد</h2>
              <p className="mt-2 max-w-md text-center text-white/60">
                اختر نوع نشاطك التجاري وسنقوم بإعداد النظام المناسب لك تلقائياً
              </p>
              <Link
                href="/systems"
                className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                اختيار نظام ←
              </Link>
            </div>
          )}

          {/* User Info */}
          <div className="mt-12 border-t border-white/[0.08] pt-6">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>{session.user.email}</span>
              <form action="/api/auth/sign-out" method="post">
                <button type="submit" className="text-red-400 transition-colors hover:text-red-300">
                  تسجيل الخروج
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </OnboardingShell>
  );
}
