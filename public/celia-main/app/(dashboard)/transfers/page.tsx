import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { TransferDashboard } from "@/components/transfers/transfer-dashboard";

export const metadata = {
  title: "Transfer Dashboard",
  description: "Customer transfer tracking dashboard",
};

export default async function TransfersPage() {
  await requireUser();

  return (
    <>
      <PageHeader titleKey="transfers.pageTitle" />
      <TransferDashboard />
    </>
  );
}
