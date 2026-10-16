import { ApiError } from "../errors.js";
import { prisma } from "../prisma.js";

export const boardMemberUserSelect = { id: true, name: true, email: true } as const;

export function boardAccessWhere(userId: string) {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

export async function getBoardForUser(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, ...boardAccessWhere(userId) },
    include: {
      owner: { select: { id: true, name: true } },
      members: { include: { user: { select: boardMemberUserSelect } } },
      lists: {
        orderBy: { position: "asc" },
        include: { cards: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!board) {
    throw new ApiError(404, "Board not found");
  }
  return board;
}

export async function getListForUser(listId: string, userId: string) {
  const list = await prisma.list.findFirst({
    where: { id: listId, board: boardAccessWhere(userId) },
  });
  if (!list) {
    throw new ApiError(404, "List not found");
  }
  return list;
}

export async function getCardForUser(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, list: { board: boardAccessWhere(userId) } },
    include: { list: { select: { id: true, boardId: true } } },
  });
  if (!card) {
    throw new ApiError(404, "Card not found");
  }
  return card;
}
