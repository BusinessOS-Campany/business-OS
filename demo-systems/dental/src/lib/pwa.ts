import type { MetadataRoute } from "next";

/** The clinic's own identity, taken from its dictionary and `applicationName`. */
export type PwaLabels = { clinicName: string; shortName: string };

/**
 * The installable manifest for a clinic app served under `mount`.
 *
 * `id`, `scope` and `start_url` are all the mount — never `/`. A manifest whose
 * `start_url` is "/" installs an icon that opens the *platform* home, and a
 * `scope` of "/" claims the entire origin, so two apps on one host fight over
 * each other. `icons[].src` is likewise scoped, or the installed app wears
 * whatever logo happens to sit at the origin root.
 */
export function buildPwaManifest(
  mount: string,
  labels: PwaLabels,
): MetadataRoute.Manifest {
  const root = mount.replace(/\/+$/, "");
  return {
    name: labels.clinicName,
    short_name: labels.shortName,
    description:
      "Dental clinic management system for Yemen — appointments, clinical records, billing and inventory. / نظام إدارة متكامل لعيادات طب الأسنان في اليمن.",
    id: root,
    start_url: `${root}/dashboard`,
    scope: root,
    display: "standalone",
    // Dental ships both LTR and RTL locales; the manifest is generated for the
    // default one (ar). No `orientation` pin — the dashboard is used on clinic
    // desktops and tablets, not just portrait phones.
    dir: "rtl",
    lang: "ar",
    background_color: "#ffffff",
    theme_color: "#008474",
    categories: ["business", "medical", "productivity"],
    icons: [
      { src: `${root}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${root}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      {
        src: `${root}/icons/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
