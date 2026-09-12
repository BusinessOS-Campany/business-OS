"use client";
import { MapPin } from "lucide-react";

export function OrderLocationLink({ shippingAddress }: { shippingAddress: string | null }) {
  let address: Record<string, any> = {};
  try { address = JSON.parse(shippingAddress ?? "{}"); } catch { address = {}; }
  const lat = address.lat ? Number(address.lat) : null;
  const lng = address.lng ? Number(address.lng) : null;
  if (!lat || !lng) return null;
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <MapPin className="h-3 w-3" />
    </a>
  );
}
