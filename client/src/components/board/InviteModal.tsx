import { useState, type FormEvent } from "react";
import type { BoardDetail } from "../../types";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";
import { UsersIcon } from "../Icons";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  board: BoardDetail;
  isOwner: boolean;
  onInvite: (email: string) => Promise<string | null>;
}

export function InviteModal({ open, onClose, board, isOwner, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const members = [
    {
      id: `owner-${board.ownerId}`,
      role: "OWNER" as const,
      userId: board.ownerId,
      user: { id: board.ownerId, name: board.owner.name, email: "" },
    },
    ...board.members,
  ];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || inviting) {
      return;
    }
    setInviting(true);
    setError(null);
    const inviteError = await onInvite(trimmed);
    setInviting(false);
    if (inviteError) {
      setError(inviteError);
    } else {
      setEmail("");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Members of ${board.title}`}>
      {isOwner && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            placeholder="teammate@example.com (must be registered)"
            onChange={(event) => setEmail(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="submit"
            disabled={inviting}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {inviting ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <UsersIcon className="h-4 w-4" />}
            Invite
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      {!isOwner && <p className="text-sm text-slate-500">Only the board owner can invite new members.</p>}

      <ul className="mt-4 space-y-2">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <Avatar name={member.user.name || "?"} id={member.user.id} className="ring-slate-50" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{member.user.name}</p>
              {member.user.email && <p className="truncate text-xs text-slate-500">{member.user.email}</p>}
            </div>
            <span className="ml-auto shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {member.role === "OWNER" ? "Owner" : "Member"}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
