"use client";
import { useState, useEffect } from "react";

const slides = [
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80",
  "https://images.unsplash.com/photo-1607082350899-7e74aa90c30b?w=1200&q=80",
  "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&q=80",
];

export function PromoBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((p) => (p + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full">
      <div className="relative overflow-hidden">
        {slides.map((src, i) => (
          <div key={i} className={i === current ? "block" : "hidden"}>
            <img src={src} alt="" className="w-full block rounded-b-xl" />
          </div>
        ))}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full cursor-pointer transition-all duration-300 ${
                i === current ? "w-[22px] h-2 bg-white" : "w-2 h-2 bg-[#d9d9d9]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
