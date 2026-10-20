"use client";
import { useState, useRef } from "react";
import { motion } from "motion/react";
import { useI18n } from "@/lib/i18n/provider";

interface SwipeAction {
  key: string;
  label: string;
  color: string;
  onSwipe: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  onTap?: () => void;
  actions?: SwipeAction[];
}

export function SwipeableCard({ children, onTap, actions }: SwipeableCardProps) {
  const [x, setX] = useState(0);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const { direction } = useI18n();
  const isRtl = direction === "rtl";

  if (!actions || actions.length === 0) {
    return (
      <div onClick={onTap} className="rounded-lg border border-border bg-card overflow-hidden cursor-pointer">
        {children}
      </div>
    );
  }

  const swipeThreshold = 100;
  const actionWidth = 80;

  const actionList = actions || [];

  function handleDragEnd(_: any, info: any) {
    const offset = info.offset.x;
    const absOffset = Math.abs(offset);
    if (absOffset < swipeThreshold) {
      setX(0);
      return;
    }
    if (isRtl) {
      if (offset > 0) {
        setActionKey(actionList[0]?.key || null);
        setX(actionWidth);
      } else {
        setActionKey(actionList[1]?.key || null);
        setX(-actionWidth);
      }
    } else {
      if (offset < 0) {
        setActionKey(actionList[0]?.key || null);
        setX(-actionWidth);
      } else {
        setActionKey(actionList[1]?.key || null);
        setX(actionWidth);
      }
    }
  }

  const handleActionConfirm = () => {
    const action = actionList.find((a) => a.key === actionKey);
    if (action) {
      action.onSwipe();
    }
    setX(0);
    setActionKey(null);
  };

  return (
    <div ref={constraintsRef} className="relative rounded-lg overflow-hidden">
      <div className="absolute inset-0 flex" style={{ direction: isRtl ? "rtl" : "ltr" }}>
        {actions.map((a, i) => (
          <div
            key={a.key}
            className="flex-1 flex items-center justify-center text-white text-sm font-bold cursor-pointer"
            style={{ backgroundColor: a.color }}
            onClick={() => { a.onSwipe(); setX(0); setActionKey(null); }}
          >
            {a.label}
          </div>
        ))}
      </div>
      <motion.div
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        dragMomentum={false}
        animate={{ x }}
        onDragEnd={handleDragEnd}
        onClick={() => { if (x === 0 && onTap) onTap(); }}
        className="relative bg-card border border-border rounded-lg cursor-pointer"
        style={{ touchAction: "pan-y" }}
      >
        {children}
      </motion.div>
      {actionKey && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10" onClick={handleActionConfirm}>
          <span className="text-white text-sm font-bold">{actionKey === "dismiss" ? "تأكيد" : "تأكيد"}</span>
        </div>
      )}
    </div>
  );
}
