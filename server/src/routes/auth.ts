import { Router } from "express";
import bcrypt from "bcryptjs";
import { ApiError, asyncHandler } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { prisma } from "../prisma.js";
import { loginSchema, registerSchema } from "../validation.js";
import { signToken } from "../utils/jwt.js";

const router = Router();

const publicUserSelect = { id: true, email: true, name: true, createdAt: true } as const;

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body as { name: string; email: string; password: string };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: publicUserSelect,
    });

    res.status(201).json({ token: signToken(user.id), user });
  })
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, "Invalid email or password");
    }

    res.json({ token: signToken(user.id), user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt } });
  })
);

router.post("/logout", (_req, res) => {
  // JWT is stateless; the client discards the token.
  res.json({ ok: true });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: publicUserSelect,
    });
    if (!user) {
      throw new ApiError(401, "Account no longer exists");
    }
    res.json({ user });
  })
);

export default router;
