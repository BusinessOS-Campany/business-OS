import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { TransferHistory } from "@/components/transfers/transfer-history";

export const metadata = {
  title: "Transfer History",
  description: "Transfer history with filters",
};

export default async function TransferHistoryPage() {
  await requireUser();

  return (
    <>
      <PageHeader titleKey="transfers.historyTitle" />
      <TransferHistory />
    </>
  );
}
