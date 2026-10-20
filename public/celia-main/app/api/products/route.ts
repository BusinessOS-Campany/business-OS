import { NextResponse } from "next/server";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createProductSchema } from "@/lib/products/product";
import { getProducts } from "@/lib/products/queries";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "set_product_price");
  if (!guard.allowed) return guard.response;

  const rows = await getProducts();
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.addProductPrice.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "set_product_price");
  if (!guard.allowed) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = createProductSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.addProductPrice.invalidData },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .insert(schema.products)
      .values({
        name: parsed.data.name,
        category: parsed.data.category,
        price: parsed.data.price.toString(),
        createdBy: session.user.id,
      })
      .returning({ id: schema.products.id });

    await createNotification({
      type: "product",
      action: "add",
      messageKey: "notifications.productAdded",
      messageParams: { name: parsed.data.name, price: parsed.data.price.toString() },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.addProductPrice.successMessage, id: row.id });
  } catch (error) {
    logger.error("product insert failed", { error });
    return NextResponse.json({ error: t.addProductPrice.saveError }, { status: 500 });
  }
}
