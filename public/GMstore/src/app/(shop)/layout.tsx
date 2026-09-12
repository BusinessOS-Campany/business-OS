import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { T } from "@/components/translate";
import { LogOut } from "lucide-react";
import { MobileNav } from "@/components/shop/mobile-nav";
import { StickyHeader } from "@/components/shop/sticky-header";
import { CartProvider } from "@/components/shop/cart-context";
import { AIAssistantWrapper } from "@/components/shop/ai-assistant-wrapper";
import { ContactSupportWrapper } from "@/components/shop/contact-support-wrapper";
import { CurrencyProvider } from "@/lib/currency/context";
import { PageTransition } from "@/components/page-transition";
import { ComparisonBar } from "@/components/shop/comparison-bar";

function SignOutForm() {
  return (
    <form action={async () => {
      "use server";
      await signOut();
    }}>
      <button type="submit" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline"><T k="nav.logout" /></span>
      </button>
    </form>
  );
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  let session: any = null;
  try { session = await auth(); } catch { session = null; }
  const role = (session?.user as any)?.role;
  return (
    <CurrencyProvider>
      <CartProvider>
      <div className="flex min-h-screen flex-col">
        <StickyHeader session={session} role={role} signOutForm={<SignOutForm />} />
        <MobileNav session={session} role={role} />
        <main className="flex-1 pb-16 md:pb-0 pt-[70px]">
          <PageTransition>{children}</PageTransition>
        </main>
        <AIAssistantWrapper />
        <ContactSupportWrapper />
        <ComparisonBar />
        <footer className="border-t border-border bg-muted py-8">
          <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} <T k="nav.store_name" />. <T k="footer.rights" />
          </div>
        </footer>
      </div>
      </CartProvider>
    </CurrencyProvider>
  );
}
