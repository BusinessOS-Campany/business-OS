"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function DealBadge({ dealEnd }: { dealEnd: string }) {
  const [remaining, setRemaining] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function tick() {
      const now = Date.now();
      const end = new Date(dealEnd).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setExpired(true);
        setRemaining("");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dealEnd]);

  if (expired) return null;

  return (
    <div className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-md px-2 py-0.5 w-fit">
      <Clock className="h-3 w-3" />
      {remaining}
    </div>
  );
}
