"use client";
import { useState } from "react";
import { ProductGallery } from "./product-gallery";
import { ProductActions } from "./product-actions";
import type { ReactNode } from "react";

interface Props {
  images: string[];
  videoUrl?: string | null;
  alt: string;
  colors: string[];
  sizes: string[];
  stock: number;
  colorStock?: Record<string, number> | null;
  colorImages?: Record<string, string> | null;
  cartProduct: { id: string; name: string; price: number; images: string[]; stock: number };
  isOwner?: boolean;
  children: ReactNode;
}

export function ProductDisplay({ images, videoUrl, alt, colors, sizes, stock, colorStock, colorImages, cartProduct, isOwner, children }: Props) {
  const [selectedColor, setSelectedColor] = useState(colors[0] || "");
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ProductGallery images={images} videoUrl={videoUrl} alt={alt} selectedColor={selectedColor} colorImages={colorImages} />
      <div className="space-y-5">
        {children}
        {!isOwner && (
          <ProductActions product={cartProduct} colors={colors} sizes={sizes} stock={stock} colorStock={colorStock} colorImages={colorImages} onColorChange={setSelectedColor} />
        )}
      </div>
    </div>
  );
}
