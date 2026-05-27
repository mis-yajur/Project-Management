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
  enableHighlight?: boolean; // Guides user attention by highlighting the trigger
  customContent?: React.ReactNode; // Allows passing any widget inside the popup!
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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const calculatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;
      let transformOrigin = "top center";

      // Simple auto-position intelligence
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let resolvedPosition = position;
      if (position === "auto") {
        resolvedPosition = spaceBelow < 180 && spaceAbove > spaceBelow ? "top" : "bottom";
      }

      switch (resolvedPosition) {
        case "top":
          top = rect.top + scrollY - 8;
          left = rect.left + scrollX + rect.width / 2;
          transformOrigin = "bottom center";
          break;
        case "bottom":
        default:
          top = rect.bottom + scrollY + 8;
          left = rect.left + scrollX + rect.width / 2;
          transformOrigin = "top center";
          break;
        case "left":
          top = rect.top + scrollY + rect.height / 2;
          left = rect.left + scrollX - 8;
          transformOrigin = "right center";
          break;
        case "right":
          top = rect.top + scrollY + rect.height / 2;
          left = rect.right + scrollX + 8;
          transformOrigin = "left center";
          break;
      }

      setMenuStyle({
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        transform: resolvedPosition === "top" || resolvedPosition === "bottom" ? "translateX(-50%)" : "translateY(-50%)",
        transformOrigin,
        zIndex: 100,
      });
    };

    calculatePosition();
    window.addEventListener("resize", calculatePosition);
    window.addEventListener("scroll", calculatePosition);

    return () => {
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", calculatePosition);
    };
  }, [isOpen, position]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Shapes class resolution
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
        return "rounded-2xl p-2 min-w-[180px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]";
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={triggerRef}>
      {/* Trigger Wrapper */}
      <div 
        onClick={toggleOpen} 
        className={`relative z-10 transition-transform ${isOpen && enableHighlight ? "scale-[1.03]" : ""}`}
      >
        {trigger}
      </div>

      {/* Spotlight highlight to guide user attention */}
      {isOpen && enableHighlight && (
        <div 
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] pointer-events-none z-40 transition-opacity duration-300"
          style={{ mixBlendMode: "multiply" }}
        />
      )}

      {/* Popover Portal / Absolute Element */}
      <AnimatePresence>
        {isOpen && (
          <div style={menuStyle} ref={popoverRef} className="pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: position === "top" ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: position === "top" ? 3 : -3 }}
              transition={{ type: "spring", stiffness: 350, damping: 24 }}
              className={`bg-white border border-slate-200/80 text-slate-800 ${getShapeClass()}`}
            >
              {customContent ? (
                <div className="p-2">{customContent}</div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {items.map((item, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onClick(e);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                        item.danger
                          ? "text-red-650 hover:bg-red-50"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      } ${item.className || ""}`}
                    >
                      {item.icon && <span className="opacity-80 text-current">{item.icon}</span>}
                      <span>{item.label}</span>
                    </motion.button>
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
