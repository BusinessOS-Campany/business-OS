import { MerchantOrderList } from "@/components/merchant/merchant-order-list";

export default function MerchantCancelledOrdersPage() {
  return <MerchantOrderList cancelled={true} />;
}
