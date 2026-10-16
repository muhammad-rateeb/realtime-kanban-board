import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardData } from "../../types";
import { cn } from "../../lib/cn";
import { CalendarIcon } from "../Icons";

/** Set right after a drag ends so the click that follows a drop doesn't open the card modal. */
export const dragGuard = { at: 0 };

export function DueBadge({ dueDate }: { dueDate: string }) {
  const date = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const overdue = due.getTime() < today.getTime();
  const soon = !overdue && due.getTime() - today.getTime() <= 2 * 24 * 60 * 60 * 1000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        overdue ? "bg-red-100 text-red-700" : soon ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
      )}
    >
      <CalendarIcon className="h-3 w-3" />
      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
    </span>
  );
}

export function CardContent({ card }: { card: CardData }) {
  return (
    <>
      <p className="text-sm leading-snug text-slate-800">{card.title}</p>
      {(card.dueDate || card.description) && (
        <div className="mt-2 flex items-center gap-2">
          {card.dueDate && <DueBadge dueDate={card.dueDate} />}
          {card.description && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400" title="Has description">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3"
                stroke="currentColor"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
            </span>
          )}
        </div>
      )}
    </>
  );
}

interface CardItemProps {
  card: CardData;
  onOpen: (card: CardData) => void;
}

export function CardItem({ card, onOpen }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card" },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (Date.now() - dragGuard.at < 200) {
          return;
        }
        onOpen(card);
      }}
      className={cn(
        "rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300",
        isDragging ? "cursor-grabbing opacity-40" : "cursor-grab"
      )}
    >
      <CardContent card={card} />
    </div>
  );
}
