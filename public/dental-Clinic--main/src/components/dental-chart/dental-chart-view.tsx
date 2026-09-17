"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { DentalChart } from "./dental-chart"
import type { ToothRecordDTO } from "./condition-editor-dialog"

const DentalChart3D = dynamic(() => import("./dental-chart-3d").then((m) => m.DentalChart3D), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-xl border bg-muted" />,
})

interface Props {
  patientId: string
  records: ToothRecordDTO[]
  canEdit: boolean
  locale: "ar" | "en"
}

export function DentalChartView({ patientId, records, canEdit, locale }: Props) {
  const [view, setView] = useState<"2d" | "3d">("2d")
  const [selectedNumber, setSelectedNumber] = useState<number | undefined>()

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border bg-muted p-0.5">
        {(["2d", "3d"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {v === "2d" ? (locale === "ar" ? "ثنائي الأبعاد" : "2D") : "3D"}
          </button>
        ))}
      </div>

      {view === "2d" ? (
        <DentalChart patientId={patientId} records={records} canEdit={canEdit} locale={locale} />
      ) : (
        <DentalChart3D
          records={records}
          selectedNumber={selectedNumber}
          onSelect={(meta) => setSelectedNumber(meta.number)}
        />
      )}
    </div>
  )
}