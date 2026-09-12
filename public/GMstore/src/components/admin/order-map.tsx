"use client";
import { MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  lat?: number | null;
  lng?: number | null;
}

export function OrderMap({ lat, lng }: Props) {
  const { t } = useI18n();
  const displayLat = lat ?? 24.7136;
  const displayLng = lng ?? 46.6753;

  return (
    <div className="space-y-2">
      <iframe
        src={`https://www.google.com/maps?q=${displayLat},${displayLng}&z=15&output=embed`}
        width="100%"
        height="256"
        style={{ border: 0, borderRadius: "0.5rem" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={t("admin.customer_location")}
      />
      <a
        href={`https://www.google.com/maps?q=${displayLat},${displayLng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <MapPin className="h-3.5 w-3.5" /> {t("admin.view_on_google_maps")}
      </a>
    </div>
  );
}
