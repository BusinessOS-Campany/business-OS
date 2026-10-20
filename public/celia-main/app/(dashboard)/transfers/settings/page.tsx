import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsView } from "@/components/transfers/settings-view";

export const metadata = {
  title: "Transfer Settings",
  description: "NAS shares and agent settings",
};

export default async function SettingsPage() {
  const session = await requireUser();

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <>
      <PageHeader titleKey="transfers.settingsTitle" />
      <SettingsView />
    </>
  );
}
