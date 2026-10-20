import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const responsiveCSS = `
.s-table { border: 1px solid hsl(var(--border)); border-collapse: collapse; margin: 0; padding: 0; width: 100%; table-layout: fixed; }
.s-table caption { font-size: 1.5em; margin: .5em 0 .75em; }
.s-table tr { background-color: hsl(var(--card)); border: 1px solid hsl(var(--border)); padding: .35em; }
.s-table th, .s-table td { padding: .625em; text-align: center; }
.s-table th { font-size: .85em; letter-spacing: .1em; text-transform: uppercase; }
@media screen and (max-width: 640px) {
  .s-table { border: 0; }
  .s-table thead { border: none; clip: rect(0 0 0 0); height: 1px; margin: -1px; overflow: hidden; padding: 0; position: absolute; width: 1px; }
  .s-table tr { border-bottom: 3px solid hsl(var(--border)); display: block; margin-bottom: .625em; }
  .s-table td { border-bottom: 1px solid hsl(var(--border)); display: block; font-size: .8em; text-align: right; }
  .s-table td::before { content: attr(data-label); float: left; font-weight: bold; text-transform: uppercase; font-size: .85em; color: hsl(var(--muted-foreground)); }
  .s-table td:last-child { border-bottom: 0; }
}
`;

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <>
      <style>{responsiveCSS}</style>
      <div className="overflow-x-auto rounded-lg border border-border" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className={cn("s-table caption-bottom text-sm", className)} {...props} />
      </div>
    </>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-muted [&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-border transition-colors hover:bg-muted/50", className)} {...props} />;
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-12 px-4 text-left align-middle font-medium text-muted-foreground", className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("p-4 align-middle", className)} {...props} />;
}
