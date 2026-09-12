import { CategoryForm } from "@/components/admin/category-form";
import { T } from "@/components/translate";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold"><T k="admin.new_category_title" /></h1>
      <CategoryForm />
    </div>
  );
}
