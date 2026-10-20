import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { DevicesView } from "@/components/transfers/devices-view";

export const metadata = {
  title: "Customer Devices",
  description: "Connected customer devices",
};

export default async function DevicesPage() {
  await requireUser();

  return (
    <>
      <PageHeader titleKey="transfers.devicesTitle" />
      <DevicesView />
    </>
  );
}
