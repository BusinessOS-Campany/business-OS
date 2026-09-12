"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const { t } = useLocale();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" onClick={handleSignOut}>
      <LogOut className="size-4" aria-hidden="true" />
      {t.header.signOut}
    </Button>
  );
}
