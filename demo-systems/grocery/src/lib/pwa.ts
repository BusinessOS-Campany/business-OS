import type { MetadataRoute } from "next";

/** The two names the store shows up under, taken from the app's dictionary. */
export type PwaLabels = { storeName: string; appName: string };

/**
 * The installable manifest for a store app served under `mount`.
 *
 * `id`, `scope` and `start_url` are all the mount — never `/`. A manifest whose
 * `start_url` is "/" installs an icon that opens the *platform* home, and a
 * `scope` of "/" claims the entire origin, so two apps on one host fight over
 * each other. `icons[].src` is likewise scoped, or the installed app wears
 * whatever logo happens to sit at the origin root.
 */
export function buildPwaManifest(
  mount: string,
  labels: { storeName: string; appName: string },
): MetadataRoute.Manifest {
  const root = mount.replace(/\/+$/, "");
  return {
    name: `${labels.storeName} — ${labels.appName}`,
    short_name: labels.appName,
    description: "Grocery store management system / نظام إدارة متجر البقالة",
    id: root,
    start_url: `${root}/dashboard`,
    scope: root,
    display: "standalone",
    orientation: "portrait-primary",
    dir: "rtl",
    lang: "ar",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    categories: ["business", "productivity", "shopping"],
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
