import { Store } from "lucide-react";
import { T } from "@/components/translate";

export default function AdminLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-4">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-primary/20 animate-ping" />
        <Store className="relative h-10 w-10 text-primary animate-bounce" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse"><T k="general.loading" /></p>
    </div>
  );
}
