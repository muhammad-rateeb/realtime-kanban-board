import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const boardCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
});

export const boardUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
});

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const listCreateSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(120),
});

export const listUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
});

export const cardCreateSchema = z.object({
  listId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  dueDate: z.coerce.date().optional(),
});

export const cardUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(200).optional(),
  description: z.string().max(5000).nullish(),
  dueDate: z.coerce.date().nullish(),
  position: z.number().finite().optional(),
  listId: z.string().min(1).optional(),
});
