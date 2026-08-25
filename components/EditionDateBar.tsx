import { ArrowLeft, ArrowRight } from "lucide-react";

function DateNavButton({ direction }: { direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;
  const label = direction === "prev" ? "Previous day" : "Next day";
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-100">
        <Icon className="h-4 w-4 text-text-accent" strokeWidth={1.5} />
      </span>
    </button>
  );
}

export function EditionDateBar({ date }: { date: string }) {
  return (
    <div className="flex items-center px-6 py-4">
      <DateNavButton direction="prev" />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-lg text-text-primary">{date}</p>
      </div>
      <DateNavButton direction="next" />
    </div>
  );
}
