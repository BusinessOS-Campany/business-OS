"use client";
import { useState, useEffect } from "react";
import { GitCompareArrows } from "lucide-react";
import { addToComparison, removeFromComparison, isInComparison } from "@/lib/comparison/store";

export function CompareButton({ productId, className = "", iconClass = "h-4 w-4" }: { productId: string; className?: string; iconClass?: string }) {
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    setInCompare(isInComparison(productId));
    const handler = () => setInCompare(isInComparison(productId));
    window.addEventListener("comparisonUpdated", handler);
    return () => window.removeEventListener("comparisonUpdated", handler);
  }, [productId]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      removeFromComparison(productId);
    } else {
      addToComparison(productId);
    }
  };

  return (
    <button onClick={toggle} className={className} title={inCompare ? "إزالة من المقارنة" : "إضافة إلى المقارنة"}>
      <GitCompareArrows className={`${iconClass} ${inCompare ? "text-primary" : "text-muted-foreground hover:text-primary"} transition-colors`} />
    </button>
  );
}
