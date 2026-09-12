"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { T } from "@/components/translate";

interface Slide {
  id: string;
  image: string;
  title?: string | null;
  titleEn?: string | null;
  desc?: string | null;
  descEn?: string | null;
  link: string;
}

export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(0);
  const touchEnd = useRef(0);
  const { direction, locale } = useI18n();

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  function prev() { setCurrent((p) => (p - 1 + slides.length) % slides.length); }
  function next() { setCurrent((p) => (p + 1) % slides.length); }

  function handleTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0].clientX; }
  function handleTouchMove(e: React.TouchEvent) { touchEnd.current = e.touches[0].clientX; }
  function handleTouchEnd() {
    const diff = touchStart.current - touchEnd.current;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
  }

  const s = slides[current];
  const title = locale === "en" ? s.titleEn || s.title : s.title;
  const desc = locale === "en" ? s.descEn || s.desc : s.desc;

  return (
    <section
      className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] overflow-hidden -mt-[70px] select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {slides.map((slide, i) => (
        <div key={slide.id} className={`absolute inset-0 transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0"}`}>
          <Image src={slide.image} alt="" fill className="object-cover" sizes="100vw" priority={i === 0} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
        </div>
      ))}

      <div className="absolute inset-0 flex items-center z-10 px-6 sm:px-12 lg:px-20">
        <div className="max-w-lg">
          {title && (
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg">
              {title}
            </h2>
          )}
          {desc && (
            <p className="text-sm sm:text-lg text-white/80 mb-4 drop-shadow">
              {desc}
            </p>
          )}
          <Link
            href={s.link}
            className="inline-flex items-center gap-2 bg-[var(--primary)] hover:opacity-90 text-white font-bold px-6 py-3 rounded-lg transition-all text-sm sm:text-base"
          >
            <T k="home.shop_now" />
            <ChevronLeft className={`h-4 w-4 ${direction === "rtl" ? "" : "hidden"}`} />
          </Link>
        </div>
      </div>

      <button onClick={prev} className="absolute top-1/2 -translate-y-1/2 right-4 z-10 h-10 w-10 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 transition-colors">
        <ChevronRight className="h-5 w-5" />
      </button>
      <button onClick={next} className="absolute top-1/2 -translate-y-1/2 left-4 z-10 h-10 w-10 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 transition-colors">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}
