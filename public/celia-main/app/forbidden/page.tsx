import { requireUser } from "@/lib/session";
import { ForbiddenView } from "@/components/layout/forbidden-view";

export const metadata = {
  title: "لا تملك الصلاحية",
  description: "لا تملك صلاحية الوصول إلى هذه الصفحة",
};

export default async function ForbiddenPage() {
  await requireUser();
  return <ForbiddenView />;
}
