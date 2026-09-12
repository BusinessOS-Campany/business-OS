import { Store } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-4">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-primary/20 animate-ping" />
        <Store className="relative h-12 w-12 text-primary animate-bounce" />
      </div>
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-primary/80 animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
