"use client"

import { Component, useMemo, useState, type ReactNode } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { TEETH_BY_DENTITION, type ToothMeta } from "@/lib/dental-tooth"
import { CONDITION_VISUALS } from "@/lib/constants/clinical"
import type { ToothRecordDTO } from "./condition-editor-dialog"

const HEALTHY_COLOR = CONDITION_VISUALS.HEALTHY.color

const KIND_DIMS: Record<ToothMeta["kind"], [number, number]> = {
  molar: [8, 10],
  premolar: [7, 8],
  canine: [6, 7],
  incisor: [5, 6],
}

function ToothMesh({ meta, color, active }: { meta: ToothMeta; color: string; active: boolean }) {
  const [hovered, setHovered] = useState(false)
  const [w, d] = KIND_DIMS[meta.kind]
  return (
    <group position={meta.pos} rotation={[0, meta.rot, 0]}>
      <mesh
        position={[0, 2.4, 0]}
        scale={active ? 1.15 : hovered ? 1.08 : 1}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = "auto"
        }}
      >
        <boxGeometry args={[w, 5, d]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[-w / 2 + 1.6, -2.6, 0]}>
        <boxGeometry args={[2.2, 4, d - 2]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[w / 2 - 1.6, -2.6, 0]}>
        <boxGeometry args={[2.2, 4, d - 2]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  )
}

function Arch({ records, onSelect, selectedNumber }: {
  records: ToothRecordDTO[]
  onSelect: (meta: ToothMeta) => void
  selectedNumber?: number
}) {
  const byTooth = useMemo(() => {
    const map = new Map<number, ToothRecordDTO>()
    for (const r of records) {
      if (r.dentition === "ADULT") map.set(r.toothNumber, r)
    }
    return map
  }, [records])

  return (
    <group>
      {TEETH_BY_DENTITION.ADULT.map((t) => {
        const rec = byTooth.get(t.number)
        const conditions = rec?.conditions ?? []
        const cond = conditions.length > 0 ? conditions[conditions.length - 1].condition : undefined
        const color = cond ? CONDITION_VISUALS[cond]?.color ?? HEALTHY_COLOR : HEALTHY_COLOR
        return (
          <group key={t.number} onClick={(e) => {
            e.stopPropagation()
            onSelect(t)
          }}>
            <ToothMesh meta={t} color={color} active={selectedNumber === t.number} />
          </group>
        )
      })}
      <mesh position={[0, -22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[86, 96, 96]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.9} side={2} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

export class ChartErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export function DentalChart3D({ records, onSelect, selectedNumber }: {
  records: ToothRecordDTO[]
  onSelect: (meta: ToothMeta) => void
  selectedNumber?: number
}) {
  return (
    <ChartErrorBoundary
      fallback={
        <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
          3D not available — use the 2D chart.
        </p>
      }
    >
      <div className="h-[420px] w-full overflow-hidden rounded-xl border bg-background">
        <Canvas camera={{ position: [0, 45, 150], fov: 42 }} dpr={[1, 2]}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[30, 60, 40]} intensity={1.2} />
          <directionalLight position={[-30, -20, -40]} intensity={0.5} color="#bae6fd" />
          <Arch records={records} onSelect={onSelect} selectedNumber={selectedNumber} />
          <OrbitControls enableDamping target={[0, -8, -55]} />
        </Canvas>
      </div>
    </ChartErrorBoundary>
  )
}