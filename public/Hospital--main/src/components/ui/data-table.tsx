import * as React from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SearchIcon,
  Columns3Icon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ColumnDef<T> {
  id: string;
  header: React.ReactNode;
  accessorKey?: string;
  renderRow?: (row: T, index: number) => React.ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  exportValue?: (row: T) => string;
  className?: string;
  cellClassName?: string;
  hideable?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchValue?: (row: T) => string;
  loading?: boolean;
  pageSize?: number;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyHint?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  onRowClick?: (row: T) => void;
  toolbarActions?: React.ReactNode;
  exportFilename?: string;
  showColumnsControl?: boolean;
  initialPageSize?: number;
  className?: string;
  dense?: boolean;
}

function getValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) return acc;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  searchPlaceholder,
  searchValue,
  loading,
  pageSize = 10,
  emptyIcon,
  emptyTitle,
  emptyHint,
  emptyActionLabel,
  emptyActionHref,
  onRowClick,
  toolbarActions,
  exportFilename,
  showColumnsControl = true,
  className,
  dense = false,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<{
    id: string;
    dir: "asc" | "desc";
  } | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(0);

  const visibleColumns = columns.filter(
    (c) => c.hideable !== false || !hidden.has(c.id)
  );

  const filtered = React.useMemo(() => {
    if (!query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      const hayStack = searchValue
        ? searchValue(row)
        : columns
            .map((c) =>
              c.accessorKey
                ? String(getValue(row, c.accessorKey) ?? "")
                : ""
            )
            .join(" ");
      return hayStack.toLowerCase().includes(q);
    });
  }, [query, data, searchValue, columns]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.id === sort.id);
    if (!col) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue ? col.sortValue(a) : col.accessorKey ? getValue(a, col.accessorKey) : undefined;
      const vb = col.sortValue ? col.sortValue(b) : col.accessorKey ? getValue(b, col.accessorKey) : undefined;
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const rows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  React.useEffect(() => {
    setPage(0);
  }, [query, pageSize]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-9" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const toggleSort = (id: string) => {
    setSort((prev) =>
      prev?.id === id
        ? prev.dir === "asc"
          ? { id, dir: "desc" }
          : null
        : { id, dir: "asc" }
    );
  };

  const doExport = (type: "csv") => {
    const exportCols = columns.filter(
      (c) => c.exportValue || c.accessorKey
    );
    const header = exportCols.map((c) =>
      typeof c.header === "string" ? c.header : c.id
    );
    const lines = sorted.map((row) =>
      exportCols
        .map((c) => {
          let val = c.exportValue
            ? c.exportValue(row)
            : String(getValue(row, c.accessorKey!) ?? "");
          val = val.replace(/"/g, '""');
          const needsQuote = /[",\n;]/.test(val);
          return needsQuote ? `"${val}"` : val;
        })
        .join(",")
    );
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showSearch = Boolean(searchPlaceholder);
  const showPagination = sorted.length > pageSize;

  return (
    <div className={cn("space-y-4", className)}>
      {(showSearch || toolbarActions || showColumnsControl) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto sm:max-w-xs">
            {showSearch && (
              <div className="relative w-full">
                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-2.5" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-8 rtl:pl-3 rtl:pr-8"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {toolbarActions}
            {exportFilename && sorted.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => doExport("csv")}
                className="gap-1.5"
              >
                <DownloadIcon className="size-3.5" />
                CSV
              </Button>
            )}
            {showColumnsControl && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Columns3Icon className="size-3.5" />
                    <span className="max-sm:hidden">Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {columns.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={!hidden.has(c.id)}
                      onCheckedChange={(checked) =>
                        setHidden((prev) => {
                          const next = new Set(prev);
                          if (checked) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        })
                      }
                    >
                      {typeof c.header === "string" ? c.header : c.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={emptyIcon as LucideIcon | undefined}
          title={emptyTitle ?? "No results"}
          hint={emptyHint}
          actionLabel={emptyActionLabel}
          actionHref={emptyActionHref}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {visibleColumns.map((col) => {
                    const isSorted = sort?.id === col.id;
                    const sortable = Boolean(col.sortValue || col.accessorKey);
                    return (
                      <th
                        key={col.id}
                        className={cn(
                          "h-10 px-3 text-left font-medium text-muted-foreground align-middle whitespace-nowrap",
                          "rtl:text-right",
                          sortable && "cursor-pointer select-none hover:text-foreground",
                          col.className
                        )}
                        onClick={sortable ? () => toggleSort(col.id) : undefined}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.header}
                          {sortable &&
                            (isSorted ? (
                              sort!.dir === "asc" ? (
                                <ArrowUp className="size-3.5 text-foreground" />
                              ) : (
                                <ArrowDown className="size-3.5 text-foreground" />
                              )
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-40" />
                            ))}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={rowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b transition-colors last:border-0",
                      onRowClick && "cursor-pointer hover:bg-accent/40",
                      dense ? "h-10" : "h-12"
                    )}
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "px-3 align-middle text-foreground/90",
                          "rtl:text-right",
                          col.cellClassName
                        )}
                      >
                        {col.renderRow
                          ? col.renderRow(row, i)
                          : col.accessorKey
                          ? String(getValue(row, col.accessorKey) ?? "—")
                          : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showPagination && (
            <div className="flex items-center justify-between border-t px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {sorted.length} {""}
                results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeftIcon className="size-4 rtl:rotate-180" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  <ChevronRightIcon className="size-4 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}