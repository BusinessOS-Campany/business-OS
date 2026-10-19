import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/app-url";
import { buildPwaManifest } from "@/lib/pwa";
import { defaultLocale, dictionary } from "@/lib/i18n";

export default function manifest(): MetadataRoute.Manifest {
  const { app } = dictionary[defaultLocale];
  // Next rewrites the <link rel="manifest"> href for the mount but not this
  // body, so id/scope/start_url/icons are built mount-aware (lib/pwa.ts).
  return buildPwaManifest(BASE_PATH, {
    clinicName: defaultLocale === "ar" ? app.clinicNameAr : app.clinicName,
    // The brand the launcher shows — the same string as `applicationName` in
    // the root layout. Both locales display it as-is.
    shortName: "Dar Al-Asnan",
  });
}
