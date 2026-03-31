"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BoxRevealProps {
  children: React.ReactNode;
  className?: string;
  boxColor?: string;
  duration?: number;
}

export function BoxReveal({
  children,
  className,
  boxColor = "#5046e6",
  duration = 0.5,
}: BoxRevealProps) {
  return (
    <div className="relative">
      <div className={cn("relative z-10", className)}>
        {children}
      </div>
      <motion.div
        initial={{ left: "0%" }}
        animate={{ left: "100%" }}
        transition={{
          duration: duration,
          ease: "easeInOut",
        }}
        className="absolute inset-0 z-20"
        style={{ backgroundColor: boxColor }}
      />
    </div>
  );
}
