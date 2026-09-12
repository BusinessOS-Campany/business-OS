import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/core/auth/server";
import { resolveTenantContext } from "@/core/tenancy/context";
import {
  getOrgSettings,
  brandingCssVars,
  isModuleEnabled,
  type OrgSettings,
} from "@/core/tenancy/settings";
import { getDictAndDir, t } from "@/core/i18n/server";
import { MODULE_REGISTRY } from "@/core/modules/registry";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { SwUpdateToast } from "@/components/sw-update-toast";

/**
 * Tenant application shell. Requires session + active organization; injects
 * tenant branding as CSS custom properties and filters nav by module toggles.
 */
export default async function TenantAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const req = new Request("http://internal/rsc", {
    headers: await headers(),
  });
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) redirect("/signin");

  const ctx = await resolveTenantContext(req);
  if (!ctx) redirect("/select-org");

  const settings: OrgSettings = await getOrgSettings(
    ctx.tenant.organizationId,
  );
  const { dict, locale, dir } = await getDictAndDir();
  const brand = settings.branding;
  const cssVars = brandingCssVars(brand);

  const nav = MODULE_REGISTRY.filter((m) =>
    isModuleEnabled(settings, m.name),
  ).map((m) => ({
    ...m,
    label: t(dict, `nav.${m.name}`),
  }));

  return (
    <div
      style={cssVars as React.CSSProperties}
      className="min-h-screen bg-background"
      dir={dir}
    >
      <AppSidebar
        navItems={nav}
        user={{
          name: session.user.name,
          email: session.user.email,
        }}
        branding={brand}
        locale={locale}
        dir={dir}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <div
        className={dir === "rtl" ? "md:mr-64" : "md:ml-64"}
      >
        {/* Top bar on desktop */}
        <header
          className="sticky top-0 z-30 hidden border-b border-border bg-background md:block"
          style={{
            borderTop: `4px solid var(--brand-primary, #03EABC)`,
          }}
        >
          <div className="flex items-center justify-between px-6 py-3">
            <h1 className="text-lg font-semibold text-foreground">
              {t(dict, `nav.${nav[0]?.name ?? "dashboard"}`)}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {session.user.email}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 py-6 pb-20 md:px-6 md:pb-6">
          {children}
        </main>
      </div>

      <BottomNav />
      <SwUpdateToast />
    </div>
  );
}
