import { NextResponse } from "next/server";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createProductSaleSchema } from "@/lib/sales/product-sale";
import { getAllProductSales } from "@/lib/products/queries";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.addProduct.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "sold_products");
  if (!guard.allowed) return guard.response;

  try {
    const rows = await getAllProductSales();
    return NextResponse.json({ rows });
  } catch (error) {
    logger.error("product sales fetch failed", { error });
    return NextResponse.json({ error: t.addProduct.serverError }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.addProduct.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_product");
  if (!guard.allowed) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = createProductSaleSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.addProduct.invalidData },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .insert(schema.productSales)
      .values({
        productId: parsed.data.productId,
        quantity: 1,
        unitPrice: parsed.data.unitPrice.toString(),
        total: parsed.data.total.toString(),
        createdBy: session.user.id,
      })
      .returning({ id: schema.productSales.id });

    await createNotification({
      type: "sale",
      action: "add",
      messageKey: "notifications.saleAdded",
      messageParams: { total: parsed.data.total.toString() },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.addProduct.successMessage, id: row.id });
  } catch (error) {
    logger.error("product sale insert failed", { error });
    return NextResponse.json({ error: t.addProduct.saveError }, { status: 500 });
  }
}
