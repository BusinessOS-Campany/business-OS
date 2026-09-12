import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { T } from "@/components/translate";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let category: any = null;
  try {
    category = await prisma.category.findUnique({ where: { id } });
  } catch { category = null; }
  if (!category) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold"><T k="admin.edit_category" /></h1>
      <CategoryForm category={category} />
    </div>
  );
}
