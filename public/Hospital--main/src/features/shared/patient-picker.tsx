"use client";

import * as React from "react";
import { SearchIcon, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export interface PickerPatient {
  id: string;
  nameAr: string;
  nameEn: string;
  mrn?: string;
  phone?: string | null;
}

export function PatientPicker({
  patients,
  selectedId,
  onSelect,
  label,
  locale,
}: {
  patients: PickerPatient[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
  locale: string;
}) {
  const tc = useTranslations("common");
  const [query, setQuery] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const nameOf = (p: { nameAr: string; nameEn: string }) => (locale === "ar" ? p.nameAr : p.nameEn);
  const selectedPatient = patients.find((p) => p.id === selectedId);

  const filtered = query.trim()
    ? patients.filter((p) =>
        [p.nameAr, p.nameEn, p.mrn ?? "", p.phone ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : patients;

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-2.5" />
        <Input
          value={selectedPatient ? nameOf(selectedPatient) : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPickerOpen(true);
            onSelect("");
          }}
          onFocus={() => setPickerOpen(true)}
          onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
          placeholder={label}
          className="pl-8 rtl:pl-3 rtl:pr-8"
        />
        {pickerOpen && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">{tc("noResults")}</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent rtl:text-right"
                  onMouseDown={() => {
                    onSelect(p.id);
                    setQuery("");
                    setPickerOpen(false);
                  }}
                >
                  <UserRound className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {nameOf(p)}
                    {p.mrn ? <span className="ms-1 text-xs text-muted-foreground">· {p.mrn}</span> : null}
                  </span>
                  {p.phone ? (
                    <span dir="ltr" className="text-xs text-muted-foreground tabular-nums">
                      {p.phone}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}