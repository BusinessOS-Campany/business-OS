import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { getShareSecret, normalizeRemotePath } from "@/lib/transfers/nas";
import { listNasDirectory } from "@/lib/transfers/smb";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const shareId = url.searchParams.get("shareId");
  const rawPath = url.searchParams.get("path") ?? "";
  if (!shareId) {
    return NextResponse.json({ error: "SHARE_REQUIRED" }, { status: 400 });
  }

  const subPath = normalizeRemotePath(rawPath);
  const parts = subPath ? subPath.split("/") : [];
  if (parts.some((part) => part === "..")) {
    return NextResponse.json({ error: "INVALID_PATH" }, { status: 400 });
  }

  try {
    const share = await getShareSecret(shareId);
    if (!share) {
      return NextResponse.json({ error: "SHARE_NOT_FOUND" }, { status: 404 });
    }

    const relative = normalizeRemotePath(share.basePath ?? "");
    const combined = [relative, subPath].filter(Boolean).join("/");
    const entries = await listNasDirectory(
      share.host,
      share.share,
      combined,
      share.username,
      share.password,
    );

    return NextResponse.json({
      entries: entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
      currentPath: subPath,
      basePath: share.basePath ?? null,
    });
  } catch (error) {
    logger.error("nas explore failed", { shareId, subPath, error });
    return NextResponse.json({ error: "NAS_BROWSE_FAILED" }, { status: 500 });
  }
}
