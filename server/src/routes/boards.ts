import { Router } from "express";
import { ApiError, asyncHandler } from "../errors.js";
import { emitToBoard } from "../realtime.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { boardMemberUserSelect, getBoardForUser } from "../services/boardAccess.js";
import { boardCreateSchema, boardUpdateSchema, inviteSchema } from "../validation.js";

const router = Router();
router.use(requireAuth);

const boardInclude = {
  owner: { select: { id: true, name: true } },
  members: { include: { user: { select: boardMemberUserSelect } } },
  lists: {
    orderBy: { position: "asc" as const },
    include: { cards: { orderBy: { position: "asc" as const } } },
  },
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const boards = await prisma.board.findMany({
      where: {
        OR: [{ ownerId: req.userId! }, { members: { some: { userId: req.userId! } } }],
      },
      orderBy: { updatedAt: "desc" },
      include: boardInclude,
    });
    res.json({ boards });
  })
);

router.post(
  "/",
  validate(boardCreateSchema),
  asyncHandler(async (req, res) => {
    const { title } = req.body as { title: string };

    const board = await prisma.board.create({
      data: {
        title,
        ownerId: req.userId!,
        lists: {
          create: [
            { title: "To Do", position: 1024 },
            { title: "In Progress", position: 2048 },
            { title: "Done", position: 3072 },
          ],
        },
      },
      include: boardInclude,
    });

    res.status(201).json({ board });
  })
);

router.get(
  "/:boardId",
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.boardId, req.userId!);
    res.json({ board });
  })
);

router.patch(
  "/:boardId",
  validate(boardUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await getBoardForUser(req.params.boardId, req.userId!);
    const { title } = req.body as { title: string };

    const board = await prisma.board.update({
      where: { id: existing.id },
      data: { title },
      include: boardInclude,
    });

    emitToBoard(board.id, "board:updated", {
      board: { id: board.id, title: board.title },
      actorId: req.userId,
    });

    res.json({ board });
  })
);

router.delete(
  "/:boardId",
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.boardId, req.userId!);
    if (board.ownerId !== req.userId) {
      throw new ApiError(403, "Only the board owner can delete this board");
    }

    await prisma.board.delete({ where: { id: board.id } });

    emitToBoard(board.id, "board:deleted", { boardId: board.id, actorId: req.userId });

    res.json({ ok: true });
  })
);

router.post(
  "/:boardId/members",
  validate(inviteSchema),
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.boardId, req.userId!);
    if (board.ownerId !== req.userId) {
      throw new ApiError(403, "Only the board owner can invite members");
    }

    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(404, "No registered user with that email");
    }
    if (user.id === req.userId || board.members.some((member) => member.userId === user.id)) {
      throw new ApiError(409, "That user is already a member of this board");
    }

    const member = await prisma.boardMember.create({
      data: { boardId: board.id, userId: user.id },
      include: { user: { select: boardMemberUserSelect } },
    });

    emitToBoard(board.id, "member:added", { member, actorId: req.userId });

    res.status(201).json({ member });
  })
);

export default router;
