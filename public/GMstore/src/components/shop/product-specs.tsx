import { Check } from "lucide-react";

export function ProductSpecs({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
      {entries.map(([key, value], i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
          <Check className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-medium text-muted-foreground min-w-[100px]">{key}</span>
          <span className="text-foreground">{value}</span>
        </div>
      ))}
    </div>
  );
}
