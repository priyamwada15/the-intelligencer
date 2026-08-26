import { ArrowLeft, ArrowRight } from "lucide-react";

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
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}) {
  return (
    <div
      className="flex items-center px-6"
      style={{ paddingTop: "var(--pad-datebar-top)", paddingBottom: "var(--pad-datebar-bottom)" }}
    >
      <DateNavButton direction="prev" onClick={onPrev} disabled={prevDisabled} />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-heading text-text-primary">{date}</p>
      </div>
      <DateNavButton direction="next" onClick={onNext} disabled={nextDisabled} />
    </div>
  );
}
