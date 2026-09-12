"use client";

import { type ReactNode, useRef, useEffect, useState } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function CustomCursor({ children, className = "" }: Props) {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [clicking, setClicking] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const move = (e: globalThis.MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    const down = () => setClicking(true);
    const up = () => setClicking(false);

    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  useEffect(() => {
    const checkHover = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest("a, button, [data-cursor-hover]");
      setHovering(!!isInteractive);
    };

    window.addEventListener("mouseover", checkHover);
    return () => window.removeEventListener("mouseover", checkHover);
  }, []);

  return (
    <div className={className}>
      {children}
      <div
        className="pointer-events-none fixed top-0 left-0 z-[9999] hidden md:block"
        style={{
          transform: `translate(${pos.x - 4}px, ${pos.y - 4}px) scale(${clicking ? 0.5 : 1})`,
          transition: "transform 0.1s ease-out",
        }}
      >
        <div className="h-2 w-2 rounded-full bg-primary" />
      </div>
      <div
        className="pointer-events-none fixed top-0 left-0 z-[9998] hidden md:block"
        style={{
          transform: `translate(${pos.x - 20}px, ${pos.y - 20}px) scale(${hovering ? 1.8 : clicking ? 0.8 : 1})`,
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="h-10 w-10 rounded-full border-2"
          style={{
            borderColor: hovering ? "rgba(3,234,188,0.6)" : "rgba(3,234,188,0.25)",
          }}
        />
      </div>
    </div>
  );
}
