import { BannerForm } from "@/components/admin/banner-form";
import { T } from "@/components/translate";

export default function NewBannerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold"><T k="admin.new_banner_title" /></h1>
      <BannerForm />
    </div>
  );
}
