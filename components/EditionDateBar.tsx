"use client";

import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
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
      <div ref={containerRef} className="relative flex flex-1 items-center justify-center">
        <button
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
        <AnimatePresence>
          {isOpen && (
            <div className="absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2">
              <motion.div
                role="menu"
                aria-label="Choose an edition date"
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                style={{ transformOrigin: "top center" }}
                className="w-max min-w-[200px] overflow-hidden rounded-md border-[0.8px] border-border-black bg-surface-card py-1 shadow-[0px_12px_30px_rgba(38,58,47,0.09),0px_2px_4px_rgba(38,58,47,0.05)]"
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
            </div>
          )}
        </AnimatePresence>
      </div>
      <DateNavButton direction="next" onClick={onNext} disabled={nextDisabled} />
    </div>
  );
}
