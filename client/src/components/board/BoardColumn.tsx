import { useState, type KeyboardEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { CardData, ListData } from "../../types";
import { cn } from "../../lib/cn";
import { CheckIcon, PlusIcon, TrashIcon, XIcon } from "../Icons";
import { CardItem } from "./CardItem";

interface BoardColumnProps {
  list: ListData;
  onAddCard: (listId: string, title: string) => void;
  onRenameList: (listId: string, title: string) => void;
  onDeleteList: (list: ListData) => void;
  onOpenCard: (card: CardData) => void;
}

export function BoardColumn({ list, onAddCard, onRenameList, onDeleteList, onOpenCard }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(list.title);
  const [adding, setAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  function submitRename() {
    const title = renameValue.trim();
    setRenaming(false);
    if (title && title !== list.title) {
      onRenameList(list.id, title);
    }
  }

  function submitNewCard() {
    const title = newCardTitle.trim();
    if (!title) {
      return;
    }
    onAddCard(list.id, title);
    setNewCardTitle("");
  }

  function handleCardComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitNewCard();
    } else if (event.key === "Escape") {
      setAdding(false);
      setNewCardTitle("");
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-slate-50 ring-1 ring-slate-200",
        isOver && "ring-2 ring-sky-400"
      )}
    >
      <div className="flex items-center gap-2 px-3 pb-1 pt-2.5">
        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            maxLength={120}
            onChange={(event) => setRenameValue(event.target.value)}
            onBlur={submitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitRename();
              } else if (event.key === "Escape") {
                setRenameValue(list.title);
                setRenaming(false);
              }
            }}
            className="w-full rounded-md border border-sky-400 px-2 py-1 text-sm font-semibold text-slate-800 outline-none"
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setRenameValue(list.title);
                setRenaming(true);
              }}
              className="truncate text-sm font-semibold text-slate-700 hover:underline"
              title="Rename list"
            >
              {list.title}
            </button>
            <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {list.cards.length}
            </span>
            <button
              type="button"
              onClick={() => onDeleteList(list)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600"
              aria-label={`Delete list ${list.title}`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="pretty-scrollbar flex min-h-[6px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-1">
        {list.cards.map((card) => (
          <CardItem key={card.id} card={card} onOpen={onOpenCard} />
        ))}
        {list.cards.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
            Drop cards here
          </div>
        )}
      </div>

      <div className="px-2 pb-2 pt-1">
        {adding ? (
          <div>
            <textarea
              autoFocus
              rows={2}
              value={newCardTitle}
              maxLength={200}
              placeholder="Card title…"
              onChange={(event) => setNewCardTitle(event.target.value)}
              onKeyDown={handleCardComposerKeyDown}
              className="w-full resize-none rounded-lg bg-white p-2.5 text-sm shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-sky-400"
            />
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={submitNewCard}
                disabled={!newCardTitle.trim()}
                className="flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <CheckIcon className="h-3.5 w-3.5" /> Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setNewCardTitle("");
                }}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200"
                aria-label="Cancel"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
          >
            <PlusIcon className="h-4 w-4" /> Add a card
          </button>
        )}
      </div>
    </div>
  );
}
