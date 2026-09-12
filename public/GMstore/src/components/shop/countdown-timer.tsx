"use client";
import { useState, useEffect } from "react";

export function CountdownTimer({ target }: { target: string }) {
  const calc = () => Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(calc);

  useEffect(() => {
    setSeconds(calc());
    const id = setInterval(() => setSeconds(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-1 text-xs font-mono font-bold tabular-nums rtl:dir" dir="ltr">
      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{pad(h)}</span>
      <span className="text-muted-foreground">:</span>
      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{pad(m)}</span>
      <span className="text-muted-foreground">:</span>
      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{pad(s)}</span>
    </div>
  );
}
