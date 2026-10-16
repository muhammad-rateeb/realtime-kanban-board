import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, errMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { BoardSummary } from "../types";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { FullPageSpinner, Spinner } from "../components/ui/Spinner";
import { Avatar } from "../components/ui/Avatar";
import { PlusIcon, TrashIcon } from "../components/Icons";

export function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<{ boards: BoardSummary[] }>("/boards");
      setBoards(data.boards);
    } catch (err) {
      setError(errMessage(err, "Could not load your boards."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry() {
    setRetrying(true);
    await load();
    setRetrying(false);
  }

  async function createBoard(event: FormEvent) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || creating) {
      return;
    }
    setCreating(true);
    try {
      const data = await api.post<{ board: BoardSummary }>("/boards", { title });
      setBoards((prev) => [data.board, ...(prev ?? [])]);
      setNewTitle("");
      setShowCreate(false);
      toast.success("Board created");
    } catch (err) {
      toast.error(errMessage(err, "Could not create the board."));
    } finally {
      setCreating(false);
    }
  }

  async function deleteBoard(board: BoardSummary) {
    if (!window.confirm(`Delete "${board.title}"? All lists and cards will be removed.`)) {
      return;
    }
    const prev = boards;
    setBoards((current) => (current ?? []).filter((b) => b.id !== board.id));
    try {
      await api.delete(`/boards/${board.id}`);
      toast.success("Board deleted");
    } catch (err) {
      setBoards(prev);
      toast.error(errMessage(err, "Could not delete the board."));
    }
  }

  if (!boards && !error) {
    return <FullPageSpinner label="Loading boards…" />;
  }

  if (error && !boards) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <ErrorBanner message={error} onRetry={retry} retrying={retrying} />
      </div>
    );
  }

  return (
    <main className="pretty-scrollbar mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Your boards</h1>
          <p className="text-sm text-slate-500">
            {boards?.length ?? 0} {boards?.length === 1 ? "board" : "boards"} you own or joined
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <PlusIcon className="h-4 w-4" /> New board
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={createBoard}
          className="mt-4 flex gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <input
            autoFocus
            value={newTitle}
            maxLength={120}
            placeholder="Board title, e.g. Product roadmap"
            onChange={(event) => setNewTitle(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {creating && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            Create
          </button>
        </form>
      )}

      {boards && boards.length === 0 && (
        <div className="mt-16 text-center text-slate-500">
          <p className="text-lg font-medium">No boards yet</p>
          <p className="mt-1 text-sm">Create your first board to get started.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(boards ?? []).map((board) => (
          <div key={board.id} className="group relative">
            <Link
              to={`/board/${board.id}`}
              className="block h-full rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-sky-400"
            >
              <div className="h-1.5 w-10 rounded-full bg-sky-500" />
              <h2 className="mt-3 break-words font-semibold text-slate-800">{board.title}</h2>
              <p className="mt-1 text-xs text-slate-400">
                by {board.owner.name} · {board.lists.length} {board.lists.length === 1 ? "list" : "lists"}
              </p>
              <div className="mt-3 flex items-center gap-1">
                <Avatar name={board.owner.name} id={board.ownerId} />
                {board.members.slice(0, 3).map((member) => (
                  <Avatar key={member.id} name={member.user.name} id={member.user.id} className="-ml-2" />
                ))}
                {board.members.length > 3 && (
                  <span className="ml-1 text-xs text-slate-400">+{board.members.length - 3}</span>
                )}
              </div>
            </Link>
            {board.ownerId === user?.id && (
              <button
                type="button"
                onClick={() => deleteBoard(board)}
                className="absolute right-2 top-2 rounded-md bg-white/80 p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${board.title}`}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
