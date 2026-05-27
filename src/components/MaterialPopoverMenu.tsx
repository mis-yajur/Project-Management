import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export type PopoverShape = "standard" | "circular" | "pill" | "rounded-xl" | "brutalist";
export type PopoverPosition = "top" | "bottom" | "left" | "right" | "auto";

interface PopoverActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  danger?: boolean;
}

interface MaterialPopoverMenuProps {
  trigger: React.ReactNode;
  items: PopoverActionItem[];
  shape?: PopoverShape;
  position?: PopoverPosition;
  enableHighlight?: boolean;
  customContent?: React.ReactNode;
  className?: string;
}

export default function MaterialPopoverMenu({
  trigger,
  items,
  shape = "standard",
  position = "auto",
  enableHighlight = false,
  customContent,
  className = "",
}: MaterialPopoverMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const getShapeClass = () => {
    switch (shape) {
      case "circular":
        return "rounded-[2rem] p-4 min-w-[140px]";
      case "pill":
        return "rounded-full py-2 px-4 shadow-lg min-w-[120px]";
      case "brutalist":
        return "rounded-none border-2 border-slate-900 p-2 shadow-[4px_4px_0px_#0f172a] bg-white";
      case "rounded-xl":
        return "rounded-xl p-2.5 min-w-[180px]";
      case "standard":
      default:
        return "rounded-2xl p-2 min-w-[180px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 bg-white";
    }
  };

  // Safe CSS alignment classes
  let positionClass = "top-full right-0 mt-1.5 origin-top-right";
  if (position === "top") {
    positionClass = "bottom-full right-0 mb-1.5 origin-bottom-right";
  } else if (position === "left") {
    positionClass = "right-full top-0 mr-1.5 origin-top-right";
  } else if (position === "right") {
    positionClass = "left-full top-0 ml-1.5 origin-top-left";
  }

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Wrapper */}
      <div 
        onClick={toggleOpen} 
        className="relative z-10 transition-transform active:scale-95 cursor-pointer"
      >
        {trigger}
      </div>

      {/* Popover - rendered standard next to parent */}
      <AnimatePresence>
        {isOpen && (
          <div className={`absolute ${positionClass} z-50`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -2 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className={`text-slate-800 ${getShapeClass()}`}
            >
              {customContent ? (
                <div className="p-2">{customContent}</div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {items.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onClick(e);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                        item.danger
                          ? "text-red-500 hover:bg-rose-50"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      } ${item.className || ""}`}
                    >
                      {item.icon && <span className="opacity-80 shrink-0">{item.icon}</span>}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
