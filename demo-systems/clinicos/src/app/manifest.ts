import type { MetadataRoute } from "next";
import { BASE_PATH, buildPwaManifest } from "@/lib/pwa";

/**
 * The installable manifest. Next rewrites the `<link rel="manifest">` href for
 * the mount but not this body, so `id`/`scope`/`start_url`/`icons` are built
 * mount-aware (`lib/pwa.ts`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return buildPwaManifest(BASE_PATH, {
    name: "ClinicOS — نظام إدارة العيادات",
    // The brand the launcher shows.
    shortName: "ClinicOS",
  });
}
