"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

function DateNavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;
  const label = direction === "prev" ? "Previous day" : "Next day";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-lime">
        <Icon className="h-4 w-4 text-text-accent" strokeWidth={1.5} />
      </span>
    </button>
  );
}

type MenuPosition = { top: number; left: number };

export function EditionDateBar({
  date,
  dateOptions,
  activeDateIndex,
  onSelectDate,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  date: string;
  dateOptions: string[];
  activeDateIndex: number;
  onSelectDate: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The trigger sits inside a page-load stagger wrapper that Motion gives
  // its own stacking context (any non-"none" transform does, even at rest)
  // — a z-index on the menu can never escape that context to paint above a
  // *later* sibling section (the filter chips end up on top regardless of
  // the menu's own z-index). Portaling to document.body sidesteps the
  // whole ancestor-stacking-context problem, which is why every real
  // floating-menu implementation does this rather than fighting z-index.
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
      });
    };
    updatePosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className="flex items-center px-6"
      style={{ paddingTop: "var(--pad-datebar-top)", paddingBottom: "var(--pad-datebar-bottom)" }}
    >
      <DateNavButton direction="prev" onClick={onPrev} disabled={prevDisabled} />
      <div className="flex flex-1 items-center justify-center">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-heading text-text-primary opacity-80"
        >
          {date}
          <ChevronDown
            className={`h-4 w-4 text-text-accent transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            strokeWidth={1.5}
          />
        </button>
      </div>
      <DateNavButton direction="next" onClick={onNext} disabled={nextDisabled} />
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && menuPosition && (
              <motion.div
                ref={menuRef}
                role="menu"
                aria-label="Choose an edition date"
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  position: "absolute",
                  top: menuPosition.top + 8,
                  left: menuPosition.left,
                  x: "-50%",
                  transformOrigin: "top center",
                }}
                className="z-50 w-max min-w-[200px] overflow-hidden rounded-[16px] bg-surface-card shadow-[0px_12px_30px_rgba(38,58,47,0.09),0px_2px_4px_rgba(38,58,47,0.05)]"
              >
                {dateOptions.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    role="menuitem"
                    aria-current={index === activeDateIndex ? "true" : undefined}
                    onClick={() => {
                      onSelectDate(index);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center px-4 py-2 text-left text-body transition-colors duration-150 ${
                      index === activeDateIndex
                        ? "bg-accent text-text-primary"
                        : "text-text-secondary hover:bg-surface-lime"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
