import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { getTransferDevices } from "@/lib/transfers/queries";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const devices = await getTransferDevices(true);
    return NextResponse.json({ devices });
  } catch (error) {
    logger.error("get transfer devices failed", { error });
    return NextResponse.json({ error: "DEVICES_FETCH_FAILED" }, { status: 500 });
  }
}
