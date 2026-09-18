"use client";

import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Printer className="size-4" />
      {label}
    </Button>
  );
}

export function PdfButton({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <FileDown className="size-4" />
      {label}
    </Button>
  );
}
