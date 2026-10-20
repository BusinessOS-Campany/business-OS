import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createProductSchema } from "@/lib/products/product";
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
    return NextResponse.json({ error: t.addProductPrice.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "set_product_price");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;
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
      .update(schema.products)
      .set({
        name: parsed.data.name,
        category: parsed.data.category,
        price: parsed.data.price.toString(),
      })
      .where(eq(schema.products.id, id))
      .returning({ id: schema.products.id });

    if (!row) {
      return NextResponse.json({ error: t.addProductPrice.notFound }, { status: 404 });
    }

    await createNotification({
      type: "product",
      action: "update",
      messageKey: "notifications.productUpdated",
      messageParams: { name: parsed.data.name },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.addProductPrice.updatedMessage, id: row.id });
  } catch (error) {
    logger.error("product update failed", { error });
    return NextResponse.json({ error: t.addProductPrice.saveError }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.addProductPrice.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "set_product_price");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;

  try {
    const [row] = await db
      .delete(schema.products)
      .where(eq(schema.products.id, id))
      .returning({ id: schema.products.id });

    if (!row) {
      return NextResponse.json({ error: t.addProductPrice.notFound }, { status: 404 });
    }

    await createNotification({
      type: "product",
      action: "delete",
      messageKey: "notifications.productDeleted",
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.addProductPrice.deletedMessage });
  } catch (error) {
    logger.error("product delete failed", { error });
    return NextResponse.json({ error: t.addProductPrice.deleteError }, { status: 500 });
  }
}
