import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { api, errMessage } from "../lib/api";
import { cn } from "../lib/cn";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useBoardSocket } from "../hooks/useBoardSocket";
import type { BoardDetail, CardData, ListData, Member } from "../types";
import { FullPageSpinner } from "../components/ui/Spinner";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { Avatar } from "../components/ui/Avatar";
import { ArrowLeftIcon, PencilIcon, TrashIcon, UsersIcon } from "../components/Icons";
import { BoardColumn } from "../components/board/BoardColumn";
import { AddListForm } from "../components/board/AddListForm";
import { CardModal } from "../components/board/CardModal";
import { InviteModal } from "../components/board/InviteModal";
import { CardContent, dragGuard } from "../components/board/CardItem";

const POSITION_GAP = 1024;

function computePosition(cards: Array<{ position: number }>, index: number): number {
  const prev = index > 0 ? cards[index - 1].position : undefined;
  const next = index < cards.length - 1 ? cards[index + 1].position : undefined;
  if (prev === undefined && next === undefined) {
    return POSITION_GAP;
  }
  if (prev === undefined) {
    return next! / 2;
  }
  if (next === undefined) {
    return prev + POSITION_GAP;
  }
  return (prev + next) / 2;
}

function getListByCardId(lists: ListData[], cardId: string): ListData | undefined {
  return lists.find((list) => list.cards.some((card) => card.id === cardId));
}

function findCard(lists: ListData[], cardId: string): { card: CardData; list: ListData } | undefined {
  for (const list of lists) {
    const card = list.cards.find((item) => item.id === cardId);
    if (card) {
      return { card, list };
    }
  }
  return undefined;
}

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [board, setBoardState] = useState<BoardDetail | null>(null);
  const boardRef = useRef<BoardDetail | null>(null);
  const setBoard = useCallback((next: BoardDetail | null) => {
    boardRef.current = next;
    setBoardState(next);
  }, []);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const isOwner = board !== null && board.ownerId === user?.id;

  const load = useCallback(async () => {
    if (!boardId) {
      return;
    }
    setStatus("loading");
    setLoadError(null);
    try {
      const data = await api.get<{ board: BoardDetail }>(`/boards/${boardId}`);
      data.board.lists.sort((a, b) => a.position - b.position);
      data.board.lists.forEach((list) => list.cards.sort((a, b) => a.position - b.position));
      setBoard(data.board);
      setStatus("ready");
    } catch (err) {
      setLoadError(errMessage(err, "Could not load this board."));
      setStatus("error");
    }
  }, [boardId, setBoard]);

  useEffect(() => {
    void load();
  }, [load]);

  const upsertCard = useCallback(
    (card: CardData) => {
      const prev = boardRef.current;
      if (!prev) {
        return;
      }
      const withoutCard = prev.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((item) => item.id !== card.id),
      }));
      setBoard({
        ...prev,
        lists: withoutCard.map((list) =>
          list.id === card.listId
            ? { ...list, cards: [...list.cards, card].sort((a, b) => a.position - b.position) }
            : list
        ),
      });
    },
    [setBoard]
  );

  const removeCard = useCallback(
    (cardId: string) => {
      const prev = boardRef.current;
      if (!prev) {
        return;
      }
      setBoard({
        ...prev,
        lists: prev.lists.map((list) => ({
          ...list,
          cards: list.cards.filter((item) => item.id !== cardId),
        })),
      });
    },
    [setBoard]
  );

  useBoardSocket(boardId, {
    "board:updated": (payload: { board: { id: string; title: string }; actorId: string }) => {
      if (payload.actorId === user?.id) {
        return;
      }
      const prev = boardRef.current;
      if (prev && prev.id === payload.board.id) {
        setBoard({ ...prev, title: payload.board.title });
      }
    },
    "board:deleted": () => {
      toast.error("This board was deleted by its owner");
      navigate("/", { replace: true });
    },
    "member:added": (payload: { member: Member; actorId: string }) => {
      if (payload.actorId === user?.id) {
        return;
      }
      const prev = boardRef.current;
      if (prev && !prev.members.some((member) => member.id === payload.member.id)) {
        setBoard({ ...prev, members: [...prev.members, payload.member] });
      }
    },
    "list:created": (payload: { list: ListData; actorId: string }) => {
      if (payload.actorId === user?.id) {
        return;
      }
      const prev = boardRef.current;
      if (prev && !prev.lists.some((list) => list.id === payload.list.id)) {
        setBoard({ ...prev, lists: [...prev.lists, { ...payload.list, cards: payload.list.cards ?? [] }] });
      }
    },
    "list:updated": (payload: { list: { id: string; title: string; position: number }; actorId: string }) => {
      if (payload.actorId === user?.id) {
        return;
      }
      const prev = boardRef.current;
      if (!prev) {
        return;
      }
      setBoard({
        ...prev,
        lists: prev.lists.map((list) =>
          list.id === payload.list.id
            ? { ...list, title: payload.list.title, position: payload.list.position }
            : list
        ),
      });
    },
    "list:deleted": (payload: { listId: string; actorId: string }) => {
      if (payload.actorId === user?.id) {
        return;
      }
      const prev = boardRef.current;
      if (prev) {
        setBoard({ ...prev, lists: prev.lists.filter((list) => list.id !== payload.listId) });
      }
    },
    "card:created": (payload: { card: CardData; actorId: string }) => {
      if (payload.actorId === user?.id) {
        return;
      }
      const prev = boardRef.current;
      if (prev && !findCard(prev.lists, payload.card.id)) {
        upsertCard(payload.card);
      }
    },
    "card:updated": (payload: { card: CardData; actorId: string }) => {
      if (payload.actorId === user?.id) {
        return;
      }
      upsertCard(payload.card);
    },
    "card:deleted": (payload: { cardId: string; actorId: string }) => {
      if (payload.actorId === user?.id) {
        return;
      }
      removeCard(payload.cardId);
    },
  });

  async function createCard(listId: string, title: string) {
    const prev = boardRef.current;
    const list = prev?.lists.find((item) => item.id === listId);
    if (!prev || !list) {
      return;
    }
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const position =
      list.cards.length > 0 ? list.cards[list.cards.length - 1].position + POSITION_GAP : POSITION_GAP;
    const optimistic: CardData = { id: tempId, listId, title, description: null, dueDate: null, position };
    setBoard({
      ...prev,
      lists: prev.lists.map((item) =>
        item.id === listId ? { ...item, cards: [...item.cards, optimistic] } : item
      ),
    });
    try {
      const data = await api.post<{ card: CardData }>("/cards", { listId, title });
      const current = boardRef.current;
      if (!current) {
        return;
      }
      setBoard({
        ...current,
        lists: current.lists.map((item) =>
          item.id === listId
            ? { ...item, cards: item.cards.map((card) => (card.id === tempId ? data.card : card)) }
            : item
        ),
      });
    } catch (err) {
      const current = boardRef.current;
      if (current) {
        setBoard({
          ...current,
          lists: current.lists.map((item) =>
            item.id === listId
              ? { ...item, cards: item.cards.filter((card) => card.id !== tempId) }
              : item
          ),
        });
      }
      toast.error(errMessage(err, "Could not add the card."));
    }
  }

  async function createList(title: string) {
    const prev = boardRef.current;
    if (!prev) {
      return;
    }
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const position =
      prev.lists.length > 0 ? Math.max(...prev.lists.map((item) => item.position)) + POSITION_GAP : POSITION_GAP;
    const optimistic: ListData = { id: tempId, boardId: prev.id, title, position, cards: [] };
    setBoard({ ...prev, lists: [...prev.lists, optimistic] });
    try {
      const data = await api.post<{ list: ListData }>("/lists", { boardId: prev.id, title });
      const current = boardRef.current;
      if (!current) {
        return;
      }
      setBoard({
        ...current,
        lists: current.lists.map((item) =>
          item.id === tempId ? { ...data.list, cards: data.list.cards ?? [] } : item
        ),
      });
    } catch (err) {
      const current = boardRef.current;
      if (current) {
        setBoard({ ...current, lists: current.lists.filter((item) => item.id !== tempId) });
      }
      toast.error(errMessage(err, "Could not add the list."));
    }
  }

  async function renameList(listId: string, title: string) {
    const prev = boardRef.current;
    const prevList = prev?.lists.find((item) => item.id === listId);
    if (!prev || !prevList) {
      return;
    }
    setBoard({
      ...prev,
      lists: prev.lists.map((item) => (item.id === listId ? { ...item, title } : item)),
    });
    try {
      await api.patch(`/lists/${listId}`, { title });
    } catch (err) {
      const current = boardRef.current;
      if (current) {
        setBoard({
          ...current,
          lists: current.lists.map((item) => (item.id === listId ? { ...item, title: prevList.title } : item)),
        });
      }
      toast.error(errMessage(err, "Could not rename the list."));
    }
  }

  async function deleteList(list: ListData) {
    if (!window.confirm(`Delete list "${list.title}" and its ${list.cards.length} card(s)?`)) {
      return;
    }
    const prev = boardRef.current;
    if (!prev) {
      return;
    }
    setBoard({ ...prev, lists: prev.lists.filter((item) => item.id !== list.id) });
    try {
      await api.delete(`/lists/${list.id}`);
    } catch (err) {
      const current = boardRef.current;
      if (current) {
        setBoard({
          ...current,
          lists: [...current.lists, list].sort((a, b) => a.position - b.position),
        });
      }
      toast.error(errMessage(err, "Could not delete the list."));
    }
  }

  async function saveCard(
    cardId: string,
    patch: { title: string; description: string; dueDate: string | null }
  ): Promise<boolean> {
    const prev = boardRef.current;
    const found = prev ? findCard(prev.lists, cardId) : undefined;
    if (!prev || !found) {
      return false;
    }
    const description = patch.description.trim() ? patch.description : null;
    upsertCard({ ...found.card, title: patch.title, description, dueDate: patch.dueDate });
    try {
      const data = await api.patch<{ card: CardData }>(`/cards/${cardId}`, {
        title: patch.title,
        description,
        dueDate: patch.dueDate,
      });
      upsertCard(data.card);
      return true;
    } catch (err) {
      upsertCard(found.card);
      toast.error(errMessage(err, "Could not save the card."));
      return false;
    }
  }

  async function deleteCard(cardId: string): Promise<void> {
    const prev = boardRef.current;
    const found = prev ? findCard(prev.lists, cardId) : undefined;
    if (!prev || !found) {
      return;
    }
    removeCard(cardId);
    setOpenCardId(null);
    try {
      await api.delete(`/cards/${cardId}`);
    } catch (err) {
      upsertCard(found.card);
      toast.error(errMessage(err, "Could not delete the card."));
    }
  }

  async function commitBoardRename() {
    setRenamingTitle(false);
    const current = boardRef.current;
    const title = titleDraft.trim();
    if (!current || !title || title === current.title) {
      return;
    }
    const prevTitle = current.title;
    setBoard({ ...current, title });
    try {
      await api.patch(`/boards/${current.id}`, { title });
    } catch (err) {
      const latest = boardRef.current;
      if (latest) {
        setBoard({ ...latest, title: prevTitle });
      }
      toast.error(errMessage(err, "Could not rename the board."));
    }
  }

  async function handleDeleteBoard() {
    const current = boardRef.current;
    if (!current) {
      return;
    }
    if (!window.confirm(`Delete board "${current.title}"? All lists and cards will be removed.`)) {
      return;
    }
    try {
      await api.delete(`/boards/${current.id}`);
      toast.success("Board deleted");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(errMessage(err, "Could not delete the board."));
    }
  }

  async function inviteMember(email: string): Promise<string | null> {
    const current = boardRef.current;
    if (!current) {
      return "Board is not loaded yet.";
    }
    try {
      const data = await api.post<{ member: Member }>(`/boards/${current.id}/members`, { email });
      const latest = boardRef.current;
      if (latest && !latest.members.some((member) => member.id === data.member.id)) {
        setBoard({ ...latest, members: [...latest.members, data.member] });
      }
      toast.success(`${data.member.user.name} joined the board`);
      return null;
    } catch (err) {
      return errMessage(err, "Could not invite that user.");
    }
  }

  async function persistMove(moved: CardData, original: CardData) {
    try {
      await api.patch(`/cards/${moved.id}`, { listId: moved.listId, position: moved.position });
    } catch (err) {
      upsertCard(original);
      toast.error(errMessage(err, "Could not save the move — card restored."));
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const dragOrigin = useRef<{ listId: string; index: number; card: CardData } | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    const prev = boardRef.current;
    const list = prev ? getListByCardId(prev.lists, activeId) : undefined;
    const index = list ? list.cards.findIndex((card) => card.id === activeId) : -1;
    dragOrigin.current =
      list && index !== -1 ? { listId: list.id, index, card: list.cards[index] } : null;
    setActiveCardId(activeId);
  }

  function handleDragOver(event: DragOverEvent) {
    const over = event.over;
    if (!over) {
      return;
    }
    const activeId = String(event.active.id);
    const overId = String(over.id);
    if (activeId === overId) {
      return;
    }
    const prev = boardRef.current;
    if (!prev) {
      return;
    }
    const sourceList = getListByCardId(prev.lists, activeId);
    const targetList = getListByCardId(prev.lists, overId) ?? prev.lists.find((list) => list.id === overId);
    if (!sourceList || !targetList || sourceList.id === targetList.id) {
      return;
    }
    const card = sourceList.cards.find((item) => item.id === activeId);
    if (!card) {
      return;
    }
    const overIndexInTarget = targetList.cards.findIndex((item) => item.id === overId);
    const insertIndex = overIndexInTarget === -1 ? targetList.cards.length : overIndexInTarget;
    setBoard({
      ...prev,
      lists: prev.lists.map((list) => {
        if (list.id === sourceList.id) {
          return { ...list, cards: list.cards.filter((item) => item.id !== activeId) };
        }
        if (list.id === targetList.id) {
          const cards = [...list.cards];
          cards.splice(insertIndex, 0, { ...card, listId: targetList.id });
          return { ...list, cards };
        }
        return list;
      }),
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    dragGuard.at = Date.now();
    setActiveCardId(null);
    const origin = dragOrigin.current;
    dragOrigin.current = null;
    const prev = boardRef.current;
    if (!prev || !origin) {
      return;
    }
    const activeId = String(event.active.id);
    const currentList = getListByCardId(prev.lists, activeId);
    if (!currentList) {
      return;
    }
    const currentIndex = currentList.cards.findIndex((card) => card.id === activeId);
    if (currentIndex === -1) {
      return;
    }

    if (currentList.id !== origin.listId) {
      // Cross-list move: onDragOver already placed the card, commit it even if the
      // final collision resolves to the dragged card itself (e.g. empty column).
      const original = origin.card;
      const moved: CardData = {
        ...currentList.cards[currentIndex],
        listId: currentList.id,
        position: computePosition(currentList.cards, currentIndex),
      };
      if (moved.listId === original.listId && moved.position === original.position) {
        return;
      }
      setBoard({
        ...prev,
        lists: prev.lists.map((list) =>
          list.id === currentList.id
            ? { ...list, cards: list.cards.map((card) => (card.id === activeId ? moved : card)) }
            : list
        ),
      });
      void persistMove(moved, original);
      return;
    }

    const over = event.over;
    if (!over) {
      return;
    }
    const overId = String(over.id);
    let newIndex =
      overId === currentList.id
        ? currentList.cards.length - 1
        : currentList.cards.findIndex((card) => card.id === overId);
    if (newIndex === -1) {
      newIndex = currentList.cards.length - 1;
    }
    if (newIndex === currentIndex) {
      return;
    }
    const cards = arrayMove(currentList.cards, currentIndex, newIndex);
    const original = currentList.cards[currentIndex];
    const moved: CardData = {
      ...cards[newIndex],
      listId: currentList.id,
      position: computePosition(cards, newIndex),
    };
    if (moved.position === original.position) {
      return;
    }
    setBoard({
      ...prev,
      lists: prev.lists.map((list) =>
        list.id === currentList.id
          ? { ...list, cards: cards.map((card) => (card.id === activeId ? moved : card)) }
          : list
      ),
    });
    void persistMove(moved, original);
  }

  function handleDragCancel(event: DragCancelEvent) {
    dragGuard.at = Date.now();
    setActiveCardId(null);
    const origin = dragOrigin.current;
    dragOrigin.current = null;
    const prev = boardRef.current;
    if (!prev || !origin) {
      return;
    }
    const activeId = String(event.active.id);
    const currentList = getListByCardId(prev.lists, activeId);
    if (!currentList || currentList.id === origin.listId) {
      return;
    }
    // Undo the optimistic cross-list placement from onDragOver.
    setBoard({
      ...prev,
      lists: prev.lists.map((list) => {
        if (list.id === currentList.id) {
          return { ...list, cards: list.cards.filter((card) => card.id !== activeId) };
        }
        if (list.id === origin.listId) {
          const cards = [...list.cards];
          cards.splice(Math.min(origin.index, cards.length), 0, origin.card);
          return { ...list, cards };
        }
        return list;
      }),
    });
  }

  if (status === "loading") {
    return <FullPageSpinner label="Loading board…" />;
  }

  if (status === "error" || !board) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <ErrorBanner message={loadError ?? "Board not found"} onRetry={load} />
        <Link to="/" className="mt-2 text-sm font-medium text-sky-600 hover:text-sky-700">
          ← Back to boards
        </Link>
      </div>
    );
  }

  const openCard = openCardId ? findCard(board.lists, openCardId) : undefined;
  const activeCard = activeCardId ? findCard(board.lists, activeCardId) : undefined;

  return (
    <>
      <header className="flex flex-wrap items-center gap-x-2 gap-y-2 bg-slate-800 px-4 py-3 text-white">
        <Link
          to="/"
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          aria-label="Back to boards"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        {renamingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            maxLength={120}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitBoardRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitBoardRename();
              } else if (event.key === "Escape") {
                setRenamingTitle(false);
              }
            }}
            className="w-56 rounded-md bg-white/10 px-2 py-1 text-sm font-semibold text-white outline-none ring-1 ring-white/30 focus:ring-white/60"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitleDraft(board.title);
              setRenamingTitle(true);
            }}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-semibold hover:bg-white/10"
            title="Rename board"
          >
            {board.title}
            {isOwner && <PencilIcon className="h-3.5 w-3.5 text-slate-400" />}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center sm:flex">
            <Avatar name={board.owner.name} id={board.ownerId} className="ring-slate-800" />
            {board.members.slice(0, 4).map((member) => (
              <Avatar
                key={member.id}
                name={member.user.name}
                id={member.user.id}
                className="-ml-1.5 ring-slate-800"
              />
            ))}
            {board.members.length > 4 && (
              <span className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-600 text-[10px] font-semibold text-white ring-2 ring-slate-800">
                +{board.members.length - 4}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            <UsersIcon className="h-3.5 w-3.5" />
            {isOwner ? "Invite" : "Members"}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={handleDeleteBoard}
              className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 hover:text-red-200"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="pretty-scrollbar flex flex-1 items-start gap-3 overflow-x-auto p-4">
          {board.lists.map((list) => (
            <SortableContext
              key={list.id}
              items={list.cards.map((card) => card.id)}
              strategy={verticalListSortingStrategy}
            >
              <BoardColumn
                list={list}
                onAddCard={createCard}
                onRenameList={renameList}
                onDeleteList={deleteList}
                onOpenCard={(card) => setOpenCardId(card.id)}
              />
            </SortableContext>
          ))}
          <AddListForm onAdd={createList} />
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className={cn("w-72 rotate-2 cursor-grabbing rounded-lg bg-white p-3 shadow-xl ring-1 ring-slate-200")}>
              <CardContent card={activeCard.card} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openCard && (
        <CardModal
          card={openCard.card}
          listTitle={openCard.list.title}
          onClose={() => setOpenCardId(null)}
          onSave={saveCard}
          onDelete={deleteCard}
        />
      )}

      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        board={board}
        isOwner={isOwner}
        onInvite={inviteMember}
      />
    </>
  );
}
