import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { StartHub } from "@/components/start/start-hub";

export default async function StartPage() {
  await requireUser();

  return (
    <>
      <PageHeader titleKey="start.title" />
      <StartHub />
    </>
  );
}