"use client";
import { useEffect, useState } from "react";

function embedUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
}

interface Props {
  value?: { lat: number; lng: number };
  onChange: (latlng: { lat: number; lng: number } | undefined) => void;
}

export function LocationPicker({ value, onChange }: Props) {
  const [mounted, setMounted] = useState(false);
  const [lat, setLat] = useState<number>(24.7136);
  const [lng, setLng] = useState<number>(46.6753);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
        () => {}
      );
    }
    setMounted(true);
  }, []);

  function handleMapClick() {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
  }

  const displayLat = value?.lat ?? lat;
  const displayLng = value?.lng ?? lng;

  if (!mounted) return <div className="h-48 rounded-lg bg-muted animate-pulse" />;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">الموقع على الخريطة (اختياري)</p>
      <div className="h-48 rounded-lg overflow-hidden border border-border cursor-pointer" onClick={handleMapClick}>
        <iframe
          src={embedUrl(displayLat, displayLng)}
          width="100%"
          height="192"
          style={{ border: 0, pointerEvents: "none" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="خريطة الموقع"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        اضغط على الخريطة لفتحها في Google Maps واختيار موقعك
      </p>
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => onChange({ lat, lng })}
          className="text-primary hover:underline"
        >
          استخدام موقعي الحالي
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-muted-foreground hover:underline"
          >
            إلغاء
          </button>
        )}
      </div>
    </div>
  );
}
