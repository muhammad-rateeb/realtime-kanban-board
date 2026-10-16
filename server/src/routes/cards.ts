import { Router } from "express";
import { ApiError, asyncHandler } from "../errors.js";
import { emitToBoard } from "../realtime.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { getCardForUser, getListForUser } from "../services/boardAccess.js";
import { cardCreateSchema, cardUpdateSchema } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  validate(cardCreateSchema),
  asyncHandler(async (req, res) => {
    const { listId, title, description, dueDate } = req.body as {
      listId: string;
      title: string;
      description?: string;
      dueDate?: Date;
    };

    const list = await getListForUser(listId, req.userId!);

    const max = await prisma.card.aggregate({
      where: { listId: list.id },
      _max: { position: true },
    });
    const position = (max._max.position ?? 0) + 1024;

    const card = await prisma.card.create({
      data: {
        listId: list.id,
        title,
        description,
        dueDate,
        position,
      },
    });

    emitToBoard(list.boardId, "card:created", { card, actorId: req.userId });

    res.status(201).json({ card });
  })
);

router.patch(
  "/:cardId",
  validate(cardUpdateSchema),
  asyncHandler(async (req, res) => {
    const card = await getCardForUser(req.params.cardId, req.userId!);
    const { title, description, dueDate, position, listId } = req.body as {
      title?: string;
      description?: string | null;
      dueDate?: Date | null;
      position?: number;
      listId?: string;
    };

    if (listId !== undefined && listId !== card.listId) {
      const targetList = await prisma.list.findFirst({
        where: { id: listId, boardId: card.list.boardId },
        select: { id: true },
      });
      if (!targetList) {
        throw new ApiError(400, "Target list must be on the same board");
      }
    }

    const updated = await prisma.card.update({
      where: { id: card.id },
      data: { title, description, dueDate, position, listId },
    });

    emitToBoard(card.list.boardId, "card:updated", { card: updated, actorId: req.userId });

    res.json({ card: updated });
  })
);

router.delete(
  "/:cardId",
  asyncHandler(async (req, res) => {
    const card = await getCardForUser(req.params.cardId, req.userId!);

    await prisma.card.delete({ where: { id: card.id } });

    emitToBoard(card.list.boardId, "card:deleted", { cardId: card.id, actorId: req.userId });

    res.json({ ok: true });
  })
);

export default router;
