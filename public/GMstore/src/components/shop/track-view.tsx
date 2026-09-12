"use client";
import { useEffect } from "react";
import { trackView } from "@/components/shop/recently-viewed";

export function TrackView({ productId }: { productId: string }) {
  useEffect(() => { trackView(productId); }, [productId]);
  return null;
}
