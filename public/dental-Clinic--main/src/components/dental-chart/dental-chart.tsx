"use client"

import { useMemo, useState } from "react"
import { TEETH_BY_DENTITION, type ToothMeta } from "@/lib/dental-tooth"
import { CONDITION_VISUALS } from "@/lib/constants/clinical"
import { cn } from "@/lib/utils"
import { ToothSvg } from "./tooth-svg"
import { ConditionEditorDialog, type ToothRecordDTO } from "./condition-editor-dialog"

const HEALTHY_COLOR = CONDITION_VISUALS.HEALTHY.color

interface Props {
  patientId: string
  records: ToothRecordDTO[]
  canEdit: boolean
  locale: "ar" | "en"
}

const UPPER_QUADS: Record<"ADULT" | "PRIMARY", { id: number; key: string }[]> = {
  ADULT: [
    { id: 1, key: "upperRight" },
    { id: 2, key: "upperLeft" },
  ],
  PRIMARY: [
    { id: 5, key: "upperRight" },
    { id: 6, key: "upperLeft" },
  ],
}
const LOWER_QUADS: Record<"ADULT" | "PRIMARY", { id: number; key: string }[]> = {
  ADULT: [
    { id: 4, key: "lowerRight" },
    { id: 3, key: "lowerLeft" },
  ],
  PRIMARY: [
    { id: 8, key: "lowerRight" },
    { id: 7, key: "lowerLeft" },
  ],
}

const ARC_AMP = 8
const TOOTH_W = 46

export function DentalChart({ patientId, records, canEdit, locale }: Props) {
  const [dentition, setDentition] = useState<"ADULT" | "PRIMARY">("ADULT")
  const [selected, setSelected] = useState<ToothMeta | null>(null)

  const byTooth = useMemo(() => {
    const map = new Map<number, ToothRecordDTO>()
    for (const r of records) {
      if (r.dentition === dentition) map.set(r.toothNumber, r)
    }
    return map
  }, [records, dentition])

  const teeth = TEETH_BY_DENTITION[dentition]

  const dominant = (rec?: ToothRecordDTO) => {
    if (!rec || rec.conditions.length === 0) return undefined
    return rec.conditions[rec.conditions.length - 1].condition
  }

  const presentConditions = useMemo(() => {
    const set = new Set<string>()
    for (const r of records) {
      for (const c of r.conditions as { condition: string }[]) set.add(c.condition)
    }
    return [...set]
  }, [records])

  function renderQuad(quadId: number, rowArc: "upper" | "lower") {
    const quadTeeth = teeth.filter((t) => t.quadrant === quadId).sort((a, b) => a.slot - b.slot)
    const maxSlot = quadTeeth.length - 1
    return quadTeeth.map((t) => {
      const rec = byTooth.get(t.number)
      const cond = dominant(rec)
      const visual = cond ? CONDITION_VISUALS[cond] : undefined
      const fill = visual?.color ?? HEALTHY_COLOR
      const isExtracted = cond === "MISSING" || cond === "EXTRACTED"
      const offset = rowArc === "upper" ? ARC_AMP * Math.sin((Math.PI * t.slot) / (maxSlot || 1)) : -ARC_AMP * Math.sin((Math.PI * t.slot) / (maxSlot || 1))
      return (
        <button
          key={t.number}
          type="button"
          className="group flex flex-col items-center gap-0.5 rounded-md px-0.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          style={{ marginTop: offset, width: TOOTH_W }}
          onClick={() => setSelected(t)}
          title={`#${t.number} ${locale === "ar" ? t.nameAr : t.nameEn}`}
        >
          <span
            className={cn(
              "block w-full transition-transform group-hover:scale-105",
              isExtracted && "opacity-50"
            )}
          >
            <ToothSvg
              kind={t.kind}
              fill={fill}
              stroke={isExtracted ? "#6b7280" : "currentColor"}
              active={selected?.number === t.number}
            />
          </span>
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums leading-none",
              selected?.number === t.number ? "text-primary" : "text-muted-foreground"
            )}
          >
            {t.number}
          </span>
        </button>
      )
    })
  }

  return (
    <div dir="ltr" className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border bg-muted p-0.5">
          {(["ADULT", "PRIMARY"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDentition(d)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                dentition === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {locale === "ar" ? (d === "ADULT" ? "دائم" : "لبني") : d === "ADULT" ? "Adult" : "Primary"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {locale === "ar" ? "انقر على أي سن لعرض أو تعديل حالته" : "Click a tooth to view or edit its condition"}
        </p>
      </div>

      <div className="space-y-6 rounded-xl border bg-background p-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {locale === "ar" ? "الفك العلوي" : "Upper arch"}
          </p>
          <div className="flex justify-center gap-6">
            {UPPER_QUADS[dentition].map((q) => (
              <div key={q.id} className="flex items-end">
                {renderQuad(q.id, "upper")}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {locale === "ar" ? "الفك السفلي" : "Lower arch"}
          </p>
          <div className="flex justify-center gap-6">
            {LOWER_QUADS[dentition].map((q) => (
              <div key={q.id} className="flex items-start">
                {renderQuad(q.id, "lower")}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border bg-background p-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-[3px]" style={{ backgroundColor: HEALTHY_COLOR }} />
          <span className="text-xs">{locale === "ar" ? "سليم" : "Healthy"}</span>
        </span>
        {presentConditions
          .filter((c) => CONDITION_VISUALS[c])
          .map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-[3px]" style={{ backgroundColor: CONDITION_VISUALS[c].color }} />
              <span className="text-xs">{locale === "ar" ? CONDITION_VISUALS[c].labelAr : CONDITION_VISUALS[c].labelEn}</span>
            </span>
          ))}
      </div>

      {selected && (
        <ConditionEditorDialog
          open
          onOpenChange={(open) => !open && setSelected(null)}
          tooth={selected}
          record={byTooth.get(selected.number)}
          patientId={patientId}
          dentition={dentition}
          canEdit={canEdit}
          locale={locale}
        />
      )}
    </div>
  )
}