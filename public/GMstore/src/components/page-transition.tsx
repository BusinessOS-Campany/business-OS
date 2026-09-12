"use client";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const isFirst = prevPath.current === pathname;
  prevPath.current = pathname;

  return (
    <motion.div
      key={pathname}
      initial={isFirst ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
