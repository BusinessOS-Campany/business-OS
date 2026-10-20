import { HeartPulseIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "size-8 rounded-lg",
  md: "size-10 rounded-xl",
  lg: "size-14 rounded-2xl",
};

export function BrandMark({ className, size = "md" }: BrandMarkProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center bg-gradient-to-br from-teal-600 via-cyan-700 to-sky-800 text-white shadow-lg shadow-teal-900/20 ring-1 ring-white/20",
        sizes[size],
        className
      )}
    >
      <HeartPulseIcon
        className={cn(
          "text-white",
          size === "sm" ? "size-4" : size === "md" ? "size-5" : "size-7"
        )}
        strokeWidth={2.2}
      />
      <span className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
    </div>
  );
}