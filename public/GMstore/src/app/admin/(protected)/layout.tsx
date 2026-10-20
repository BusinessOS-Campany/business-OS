import { auth } from "@/lib/auth";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { T } from "@/components/translate";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  let role: string | undefined;
  try {
    const session = await auth();
    role = (session?.user as any)?.role;
  } catch { role = undefined; }
  if (role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-6xl font-bold text-destructive">403</h1>
          <h2 className="text-2xl font-semibold"><T k="admin.no_permission" /></h2>
          <p className="text-muted-foreground"><T k="admin.admin_only" /></p>
          <a href="/" className="inline-block mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <T k="admin.back_to_shop" />
          </a>
        </div>
      </div>
    );
  }
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
