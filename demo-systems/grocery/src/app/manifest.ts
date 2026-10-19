import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/app-url";
import { buildPwaManifest } from "@/lib/pwa";
import { dict } from "@/shared/i18n";

export default function manifest(): MetadataRoute.Manifest {
  const t = dict();
  // Next rewrites the <link rel="manifest"> href for the mount but not this
  // body, so id/scope/start_url/icons are built mount-aware (lib/pwa.ts).
  return buildPwaManifest(BASE_PATH, {
    storeName: t.auth.storeName,
    appName: t.common.appName,
  });
}
