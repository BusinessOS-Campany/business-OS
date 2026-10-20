import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WANO STORE",
    short_name: "WANO",
    description: "Modern e-commerce store",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F9FA",
    theme_color: "#EA580C",
    lang: "ar",
    dir: "rtl",
    orientation: "portrait",
    categories: ["shopping", "ecommerce"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
