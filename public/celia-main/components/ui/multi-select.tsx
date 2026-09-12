"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  hasError,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const selected = options.filter((option) => value.includes(option.value));

  function toggleOption(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  function handleToggle() {
    if (!open) {
      const rect = rootRef.current?.getBoundingClientRect();
      const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
      setOpenUp(spaceBelow < 320);
    }
    setOpen((prev) => !prev);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3.5 text-sm shadow-sm transition-colors duration-150",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
          hasError && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate text-start",
            selected.length === 0 && "text-muted-foreground",
          )}
        >
          {selected.length === 0
            ? placeholder
            : selected.map((option) => option.label).join("، ")}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className={cn(
            "absolute inset-x-0 z-50 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl",
            openUp ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">{placeholder}</p>
          )}
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggleOption(option.value)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-muted"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
                  )}
                >
                  {checked && <Check className="size-3" aria-hidden="true" />}
                </span>
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
