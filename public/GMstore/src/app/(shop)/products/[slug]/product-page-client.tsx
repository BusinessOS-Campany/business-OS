"use client";
import { useState } from "react";
import { ImageGallery } from "./image-gallery";
import { ProductInfo } from "./product-info";

type ProductData = {
  id: string; name: string; price: number; discount?: number | null;
  images: string[]; colors: string[]; sizes: string[]; stock: number;
  category?: { name: string; nameEn?: string | null } | null;
  description?: string | null;
  colorStock?: Record<string, number> | null;
  colorImages?: Record<string, string> | null;
  videoUrl?: string | null;
};

export function ProductPageClient({ product, avgRating, reviewCount, locale }: { product: ProductData; avgRating: number; reviewCount: number; locale: string }) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || "");

  return (
    <div className="grid gap-6 lg:gap-10 lg:grid-cols-2">
      <ImageGallery images={product.images} alt={product.name} colorImages={product.colorImages} selectedColor={selectedColor} videoUrl={product.videoUrl} />
      <ProductInfo product={{ ...product, images: product.images }} avgRating={avgRating} reviewCount={reviewCount} locale={locale} selectedColor={selectedColor} onColorChange={setSelectedColor} />
    </div>
  );
}