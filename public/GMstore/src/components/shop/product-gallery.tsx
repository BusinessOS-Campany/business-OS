"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

interface Props {
  images: string[];
  videoUrl?: string | null;
  alt: string;
  selectedColor?: string;
  colorImages?: Record<string, string> | null;
}

function getYouTubeEmbed(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

export function ProductGallery({ images, videoUrl, alt, selectedColor, colorImages }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imgRef = useRef<HTMLDivElement>(null);

  const colorImg = selectedColor && colorImages?.[selectedColor];
  const displayImages = colorImg ? [colorImg, ...images] : images;

  const hasVideo = videoUrl && getYouTubeEmbed(videoUrl);
  const allItems = hasVideo
    ? [{ type: "video" as const, src: getYouTubeEmbed(videoUrl!)! }, ...displayImages.map((src) => ({ type: "image" as const, src }))]
    : displayImages.map((src) => ({ type: "image" as const, src }));

  const current = allItems[selectedIndex];

  function handleSwipe(offsetX: number) {
    if (Math.abs(offsetX) < 50) return;
    if (offsetX > 0 && selectedIndex > 0) setSelectedIndex(i => i - 1);
    if (offsetX < 0 && selectedIndex < allItems.length - 1) setSelectedIndex(i => i + 1);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!imgRef.current || !zoom) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }

  function goNext() { setSelectedIndex(i => Math.min(allItems.length - 1, i + 1)); }
  function goPrev() { setSelectedIndex(i => Math.max(0, i - 1)); }

  useEffect(() => {
    if (!fullscreen) return;
    const len = allItems.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowRight") setSelectedIndex(i => Math.min(len - 1, i + 1));
      if (e.key === "ArrowLeft") setSelectedIndex(i => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, allItems.length]);

  return (
    <div className="space-y-4 max-w-full">
      <div className="aspect-square rounded-xl bg-muted overflow-hidden relative" ref={imgRef} onMouseMove={handleMouseMove}>
        {current?.type === "video" ? (
          <iframe
            src={current.src}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={alt}
          />
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={selectedIndex}
                className="h-full w-full cursor-crosshair"
                onMouseEnter={() => { if (allItems.length > 0) setZoom(true); }}
                onMouseLeave={() => setZoom(false)}
                drag={allItems.length > 1 && !zoom ? "x" : false}
                dragElastic={0}
                dragMomentum={false}
                onDragEnd={(_, info) => handleSwipe(info.offset.x)}
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -80 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="h-full w-full relative overflow-hidden"
                  onDoubleClick={() => setFullscreen(true)}
                >
                  <img
                    src={current?.src}
                    alt={`${alt} ${selectedIndex}`}
                    className="h-full w-full object-cover pointer-events-none transition-opacity duration-200"
                    style={zoom ? { transform: "scale(1.3)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, opacity: 0 } : {}}
                    loading="lazy"
                  />
                  {zoom && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `url(${current?.src})`,
                        backgroundSize: "200%",
                        backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      }}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            <button
              onClick={() => setFullscreen(true)}
              className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <Expand className="h-4 w-4" />
            </button>
          </>
        )}
        {allItems.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIndex(i => Math.max(0, i - 1))}
              disabled={selectedIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSelectedIndex(i => Math.min(allItems.length - 1, i + 1))}
              disabled={selectedIndex === allItems.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      {allItems.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {allItems.map((item, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${i === selectedIndex ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"}`}
            >
              {item.type === "video" ? (
                <div className="h-full w-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">▶</div>
              ) : (
                <img src={item.src} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}

      {fullscreen && current?.type === "image" && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setFullscreen(false)}>
          <div className="relative flex-1 flex items-center justify-center min-h-0">
            <button
              onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
              className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {allItems.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  disabled={selectedIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  disabled={selectedIndex === allItems.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <div className="absolute top-4 left-4 z-20 text-white/60 text-sm font-medium">
              {selectedIndex + 1} / {allItems.length}
            </div>
            <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={selectedIndex}
                  className="max-h-full max-w-full"
                  initial={{ opacity: 0, x: 120 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -120 }}
                  transition={{ duration: 0.25 }}
                >
                  <img src={current.src} alt={alt} className="max-h-[85vh] max-w-full object-contain" draggable={false} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          {allItems.length > 1 && (
            <div className="flex-shrink-0 flex justify-center gap-2 pb-4 pt-2 px-4 overflow-x-auto">
              {allItems.map((item, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setSelectedIndex(i); }} className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === selectedIndex ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80"}`}>
                  <img src={item.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
