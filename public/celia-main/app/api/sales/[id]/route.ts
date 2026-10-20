import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createProductSaleSchema } from "@/lib/sales/product-sale";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.addProduct.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_product");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;
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
      .update(schema.productSales)
      .set({
        productId: parsed.data.productId,
        unitPrice: parsed.data.unitPrice.toString(),
        total: parsed.data.total.toString(),
      })
      .where(eq(schema.productSales.id, id))
      .returning({ id: schema.productSales.id });

    if (!row) {
      return NextResponse.json({ error: t.addProduct.notFound }, { status: 404 });
    }

    await createNotification({
      type: "sale",
      action: "update",
      messageKey: "notifications.saleUpdated",
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({
      success: true,
      message: t.addProduct.updatedMessage,
      id: row.id,
    });
  } catch (error) {
    logger.error("product sale update failed", { error });
    return NextResponse.json({ error: t.addProduct.saveError }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = _request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.addProduct.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_product");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;

  try {
    const [row] = await db
      .delete(schema.productSales)
      .where(eq(schema.productSales.id, id))
      .returning({ id: schema.productSales.id });

    if (!row) {
      return NextResponse.json({ error: t.addProduct.notFound }, { status: 404 });
    }

    await createNotification({
      type: "sale",
      action: "delete",
      messageKey: "notifications.saleDeleted",
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.addProduct.deletedMessage });
  } catch (error) {
    logger.error("product sale delete failed", { error });
    return NextResponse.json({ error: t.addProduct.deleteError }, { status: 500 });
  }
}
