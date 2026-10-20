"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { T } from "@/components/translate";
import { User } from "lucide-react";

export function UserGreeting({ userName }: { userName?: string | null }) {
  const name = userName;
  const [showGreeting, setShowGreeting] = useState(false);

  const open = useCallback(() => {
    setShowGreeting(true);
    setTimeout(() => setShowGreeting(false), 3000);
  }, []);

  if (!name) return null;

  return (
    <div className="fixed top-24 left-4 z-50">
      <AnimatePresence mode="wait">
        {showGreeting ? (
          <motion.div
            key="greeting"
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-xl shadow-lg whitespace-nowrap"
          >
            <User className="h-4 w-4" />
            <span className="font-medium"><T k="nav.greeting" />, {name}</span>
          </motion.div>
        ) : (
          <motion.button
            key="icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={open}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/80 text-primary-foreground shadow-md cursor-pointer"
          >
            <User className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
