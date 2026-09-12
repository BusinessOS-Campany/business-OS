import Link from "next/link";

/**
 * Shared brand shell for all non-home public pages (signin/signup/systems/
 * my-apps/select-org/demo/windy): dark `#050510` base, ambient glows, glass
 * header and unified footer. The `dark` class re-scopes theme tokens so
 * descendants that use `bg-card`/`text-muted-foreground`/`border-border`
 * render in the dark palette even when the visitor picked the light theme.
 *
 * Direction is left to the root layout (Arabic RTL by default); pages that
 * need LTR (e.g. /windy) set it on their own content subtree.
 */
export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark relative flex min-h-screen flex-col overflow-hidden bg-[#050510] text-white">
      {/* Ambient glow layers */}
      <div className="pointer-events-none fixed inset-0 -z-[5]">
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-[#0263D1]/[0.02] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-[100px]" />
      </div>

      {/* Glass header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#050510]/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#050510]/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-primary/30 sm:h-9 sm:w-9">
              <img src="/icons/BO.png" alt="Business OS" className="h-full w-full object-contain" />
            </div>
            <span className="text-base font-bold tracking-tight text-white sm:text-lg">Business OS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="rounded-xl px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/signup"
              className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/10 hover:border-primary/60"
            >
              إنشاء حساب
            </Link>
          </div>
        </div>
      </header>

      {/* Content slot — pages keep their own <main> for semantics */}
      <div className="relative z-10 flex-1">{children}</div>

      {/* Unified footer */}
      <footer className="border-t border-white/[0.08] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
              <img src="/icons/BO.png" alt="Business OS" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-bold text-white">Business OS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <Link href="/signin" className="transition-colors hover:text-white">تسجيل الدخول</Link>
            <Link href="/systems" className="transition-colors hover:text-white">الأنظمة</Link>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} بيزنس أو إس. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}