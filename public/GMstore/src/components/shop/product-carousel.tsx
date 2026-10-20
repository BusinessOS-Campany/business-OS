"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SwipeableProductCard } from "./swipeable-product-card";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  products: any[];
  isLoggedIn: boolean;
}

export function ProductCarousel({ products, isLoggedIn }: Props) {
  const { locale } = useI18n();
  const isRtl = locale === "ar";
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);
  const [dir, setDir] = useState(1);
  const touchX = useRef(0);

  useEffect(() => {
    function calc() {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      if (w < 640) setPerPage(2);
      else if (w < 1024) setPerPage(3);
      else setPerPage(4);
    }
    calc();
    const ro = new ResizeObserver(calc);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const totalPages = Math.ceil(products.length / perPage);
  const start = page * perPage;
  const chunk = products.slice(start, start + perPage);

  const goNext = useCallback(() => { setDir(1); setPage(p => Math.min(totalPages - 1, p + 1)); }, [totalPages]);
  const goPrev = useCallback(() => { setDir(-1); setPage(p => Math.max(0, p - 1)); }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onTouchStart(e: TouchEvent) { touchX.current = e.touches[0].clientX; }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 80) {
        if (dx > 0) { setDir(-1); goPrev(); }
        else { setDir(1); goNext(); }
      }
    }
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [goNext, goPrev]);

  if (products.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <div className="overflow-hidden rounded-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${perPage}, 1fr)` }}
            initial={{ opacity: 0, x: dir * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -100 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {chunk.map((p) => (
              <SwipeableProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={goPrev}
            disabled={page === 0}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-30"
          >
            {isRtl ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setDir(i > page ? 1 : -1); setPage(i); }}
                className={`h-2 rounded-full transition-all ${i === page ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
              />
            ))}
          </div>
          <button
            onClick={goNext}
            disabled={page === totalPages - 1}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-30"
          >
            {isRtl ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
