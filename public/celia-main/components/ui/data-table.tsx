"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DataTableColumn<T> {
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableLabels {
  lengthMenu: string;
  rows: string;
  search: string;
  searchPlaceholder: string;
  info: string;
  prev: string;
  next: string;
  noData: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  title: ReactNode;
  keyOf: (row: T) => string;
  searchText: (row: T) => string;
  labels: DataTableLabels;
  minWidth?: string;
  rowNumberSuffix?: string;
  rowClassName?: (row: T) => string | undefined;
  empty?: ReactNode;
}

const PAGE_LENGTHS = [5, 10, 25, 50];

export function DataTable<T>({
  rows,
  columns,
  title,
  keyOf,
  searchText,
  labels,
  minWidth = "min-w-160",
  rowNumberSuffix = "",
  rowClassName,
  empty,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [pageLength, setPageLength] = useState(5);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => searchText(row).toLowerCase().includes(query));
  }, [rows, search, searchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageLength));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * pageLength, safePage * pageLength + pageLength);
  const from = filtered.length === 0 ? 0 : safePage * pageLength + 1;
  const to = Math.min(safePage * pageLength + pageLength, filtered.length);

  function changePage(next: number) {
    setPage(Math.min(Math.max(next, 0), totalPages - 1));
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {labels.lengthMenu}
            <select
              value={pageLength}
              onChange={(event) => {
                setPageLength(Number(event.target.value));
                setPage(0);
              }}
              className="h-8 rounded-lg border border-input bg-card px-2 text-xs text-foreground"
            >
              {PAGE_LENGTHS.map((length) => (
                <option key={length} value={length}>
                  {length} {labels.rows}
                </option>
              ))}
            </select>
          </label>
          <label className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">{labels.search}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder={labels.searchPlaceholder}
              className="h-8 w-56 rounded-lg border border-input bg-card pe-3 ps-8 text-xs text-foreground placeholder:text-muted-foreground"
            />
          </label>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className={cn("w-full text-sm", minWidth)}>
          <thead>
            <tr className="border-b border-border bg-muted/60 text-start text-xs font-bold text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 text-start font-bold">
                #
              </th>
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={cn("px-4 py-2.5 text-start font-bold", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {empty ?? labels.noData}
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => (
                <tr
                  key={keyOf(row)}
                  className={cn(
                    "border-b border-border/60 last:border-b-0 hover:bg-muted/40",
                    rowClassName?.(row),
                  )}
                >
                  <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    {safePage * pageLength + index + 1}
                    {rowNumberSuffix}
                  </td>
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className={cn("px-4 py-3", column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          {labels.info
            .replace("{from}", String(from))
            .replace("{to}", String(to))
            .replace("{total}", String(filtered.length))}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => changePage(safePage - 1)}
            disabled={safePage === 0}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label={labels.prev}
            title={labels.prev}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => changePage(safePage + 1)}
            disabled={safePage >= totalPages - 1}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label={labels.next}
            title={labels.next}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>
  );
}
