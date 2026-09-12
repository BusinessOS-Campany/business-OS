"use client";
import { useState, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Play } from "lucide-react";

export function ImageGallery({ images, alt, colorImages, selectedColor, videoUrl }: { images: string[]; alt: string; colorImages?: Record<string, string> | null; selectedColor?: string; videoUrl?: string | null }) {
  const { t } = useI18n();
  const colorImg = selectedColor && colorImages?.[selectedColor];
  const defaultIndex = colorImg ? images.indexOf(colorImg) : -1;
  const [selected, setSelected] = useState(defaultIndex >= 0 ? defaultIndex : 0);
  const [showVideo, setShowVideo] = useState(false);
  const effectiveImages = colorImg && !images.includes(colorImg) ? [colorImg, ...images] : images;
  const [showZoom, setShowZoom] = useState(false);
  const [bgPos, setBgPos] = useState("0% 0%");
  const imgRef = useRef<HTMLDivElement>(null);
  const prevColor = useRef(selectedColor);
  if (selectedColor !== prevColor.current) {
    prevColor.current = selectedColor;
    setShowVideo(false);
    const ci = selectedColor && colorImages?.[selectedColor];
    if (ci) {
      const idx = effectiveImages.indexOf(ci);
      if (idx >= 0) setSelected(idx);
    } else {
      setSelected(0);
    }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setBgPos(`${x}% ${y}%`);
  }, []);

  if (!effectiveImages.length && !videoUrl) {
    return <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">{t("product.no_image")}</div>;
  }

  const isYouTube = videoUrl?.includes("youtube.com") || videoUrl?.includes("youtu.be");

  return (
    <div className="space-y-4">
      <div className="aspect-square rounded-xl bg-muted overflow-hidden relative">
        {showVideo && videoUrl ? (
          isYouTube ? (
            <iframe
              src={videoUrl.includes("watch?v=") ? videoUrl.replace("watch?v=", "embed/") : videoUrl.includes("youtu.be/") ? videoUrl.replace("youtu.be/", "youtube.com/embed/") : videoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={videoUrl} controls className="w-full h-full object-contain bg-black" />
          )
        ) : effectiveImages.length > 0 ? (
          <div
            ref={imgRef}
            className="w-full h-full cursor-crosshair"
            onMouseEnter={() => setShowZoom(true)}
            onMouseLeave={() => setShowZoom(false)}
            onMouseMove={handleMouseMove}
          >
            <img
              src={effectiveImages[selected]}
              alt={alt}
              className="w-full h-full object-cover pointer-events-none"
            />
            {showZoom && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${effectiveImages[selected]})`,
                  backgroundSize: "200%",
                  backgroundPosition: bgPos,
                  backgroundRepeat: "no-repeat",
                }}
              />
            )}
          </div>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {effectiveImages.map((img, i) => (
          <button
            key={i}
            onClick={() => { setSelected(i); setShowVideo(false); }}
            className={`h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${!showVideo && selected === i ? "border-primary" : "border-border hover:border-muted-foreground"}`}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
        {videoUrl && (
          <button
            onClick={() => setShowVideo(true)}
            className={`h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors flex items-center justify-center bg-muted ${showVideo ? "border-primary" : "border-border hover:border-muted-foreground"}`}
          >
            <Play className="h-6 w-6 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}