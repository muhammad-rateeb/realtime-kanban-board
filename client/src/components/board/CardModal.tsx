import { useEffect, useState } from "react";
import type { CardData } from "../../types";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import { TrashIcon } from "../Icons";

interface CardModalProps {
  card: CardData;
  listTitle: string;
  onClose: () => void;
  onSave: (cardId: string, patch: { title: string; description: string; dueDate: string | null }) => Promise<boolean>;
  onDelete: (cardId: string) => Promise<void>;
}

export function CardModal({ card, listTitle, onClose, onSave, onDelete }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description ?? "");
    setDueDate(card.dueDate ? card.dueDate.slice(0, 10) : "");
    setError(null);
  }, [card.id]);

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await onSave(card.id, {
      title: trimmed,
      description,
      dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
    });
    setSaving(false);
    if (ok) {
      onClose();
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this card?")) {
      return;
    }
    setDeleting(true);
    await onDelete(card.id);
    setDeleting(false);
  }

  return (
    <Modal open onClose={onClose} title={`Card in ${listTitle}`}>
      <div className="space-y-4">
        <div>
          <label htmlFor="card-title" className="block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="card-title"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label htmlFor="card-description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="card-description"
            rows={5}
            value={description}
            maxLength={5000}
            placeholder="Add more detail…"
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label htmlFor="card-due" className="block text-sm font-medium text-slate-700">
            Due date
          </label>
          <input
            id="card-due"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <TrashIcon className="h-4 w-4" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {saving && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
