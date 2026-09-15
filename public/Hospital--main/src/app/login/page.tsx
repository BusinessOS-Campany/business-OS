import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBrand } from "@/lib/services/hospital";
import { BrandMark } from "@/components/app/brand-mark";
import { LoginForm, SecurityNote } from "@/features/auth/login-form";
import { LanguageToggle } from "@/components/app/language-toggle";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { DemoAccounts } from "@/features/auth/demo-accounts";

export const metadata = {
  title: "Sign in · YemenCare HMS",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const brand = await getBrand();

  return (
    <main className="app-glow relative flex min-h-dvh flex-col bg-dots">
      <div className="pointer-events-none absolute -top-40 right-[-10%] hidden size-[32rem] rounded-full bg-teal-500/10 blur-3xl lg:block" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-8%] hidden size-[28rem] rounded-full bg-sky-500/10 blur-3xl lg:block" />

      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size="md" />
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">YemenCare HMS</p>
            <p className="text-xs text-muted-foreground">{brand.nameAr}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl border p-6 shadow-[var(--shadow-popover)] sm:p-8">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <BrandMark size="lg" />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {brand.nameAr}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Welcome back · مرحباً بعودتك
                </p>
              </div>
            </div>
            <LoginForm />
            <div className="mt-6 border-t pt-5">
              <SecurityNote />
            </div>
          </div>
          <div className="mt-4">
            <DemoAccounts />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} YemenCare HMS · {brand.nameEn}
          </p>
        </div>
      </div>
    </main>
  );
}