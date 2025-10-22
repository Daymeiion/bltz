"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface DockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

interface FloatingDockProps {
  items: DockItem[];
  className?: string;
  mobileClassName?: string;
}

export function FloatingDock({
  items,
  className,
  mobileClassName,
}: FloatingDockProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const getScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    
    const distance = Math.abs(index - hoveredIndex);
    
    if (distance === 0) return 1.2; // Main hovered icon
    if (distance === 1) return 1.1; // Adjacent icons
    return 1; // Other icons
  };

  const getY = (index: number) => {
    if (hoveredIndex === null) return 0;
    
    const distance = Math.abs(index - hoveredIndex);
    
    if (distance === 0) return -12; // Main hovered icon
    if (distance === 1) return -6; // Adjacent icons
    return 0; // Other icons
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        mobileClassName
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 px-2 py-2 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 shadow-lg",
          className
        )}
      >
        {items.map((item, index) => (
          <motion.div
            key={index}
            className="relative flex items-center justify-center"
            onHoverStart={() => setHoveredIndex(index)}
            onHoverEnd={() => setHoveredIndex(null)}
            animate={{
              scale: getScale(index),
              y: getY(index),
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            {hoveredIndex === index && (
              <motion.div
                className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap z-50"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                {item.title}
              </motion.div>
            )}
            
            <motion.div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-200",
                hoveredIndex === index
                  ? "bg-neutral-200/80 dark:bg-neutral-800/80"
                  : "hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60"
              )}
              whileTap={{ scale: 0.95 }}
              onClick={item.onClick}
            >
              {item.icon}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
