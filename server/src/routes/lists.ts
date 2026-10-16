import { Router } from "express";
import { asyncHandler } from "../errors.js";
import { emitToBoard } from "../realtime.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { getListForUser, getBoardForUser } from "../services/boardAccess.js";
import { listCreateSchema, listUpdateSchema } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  validate(listCreateSchema),
  asyncHandler(async (req, res) => {
    const { boardId, title } = req.body as { boardId: string; title: string };

    const board = await getBoardForUser(boardId, req.userId!);

    const max = await prisma.list.aggregate({
      where: { boardId: board.id },
      _max: { position: true },
    });
    const position = (max._max.position ?? 0) + 1024;

    const list = await prisma.list.create({
      data: { boardId: board.id, title, position },
    });

    const payload = { ...list, cards: [] };
    emitToBoard(board.id, "list:created", { list: payload, actorId: req.userId });

    res.status(201).json({ list: payload });
  })
);

router.patch(
  "/:listId",
  validate(listUpdateSchema),
  asyncHandler(async (req, res) => {
    const list = await getListForUser(req.params.listId, req.userId!);
    const { title } = req.body as { title: string };

    const updated = await prisma.list.update({
      where: { id: list.id },
      data: { title },
    });

    emitToBoard(list.boardId, "list:updated", { list: updated, actorId: req.userId });

    res.json({ list: updated });
  })
);

router.delete(
  "/:listId",
  asyncHandler(async (req, res) => {
    const list = await getListForUser(req.params.listId, req.userId!);

    await prisma.list.delete({ where: { id: list.id } });

    emitToBoard(list.boardId, "list:deleted", { listId: list.id, actorId: req.userId });

    res.json({ ok: true });
  })
);

export default router;
