import { useState, type FormEvent } from "react";
import { CheckIcon, PlusIcon, XIcon } from "../Icons";

export function AddListForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    onAdd(trimmed);
    setTitle("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-72 shrink-0 items-center gap-1.5 rounded-xl bg-white/60 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-white hover:text-slate-900"
      >
        <PlusIcon className="h-4 w-4" /> Add another list
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-72 shrink-0 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
      <input
        autoFocus
        value={title}
        maxLength={120}
        placeholder="List title…"
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      />
      <div className="mt-2 flex items-center gap-1">
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
        >
          <CheckIcon className="h-3.5 w-3.5" /> Add list
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle("");
          }}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200"
          aria-label="Cancel"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
