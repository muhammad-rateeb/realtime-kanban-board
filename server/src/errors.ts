import type { NextFunction, Request, RequestHandler, Response } from "express";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export interface Issue {
  path: string;
  message: string;
}

export function formatIssues(issues: { path: (string | number | symbol)[]; message: string }[]): Issue[] {
  return issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err && typeof err === "object" && (err as { name?: string }).name === "ZodError") {
    const zodError = err as { issues: { path: (string | number | symbol)[]; message: string }[] };
    res.status(400).json({ error: "Validation failed", issues: formatIssues(zodError.issues) });
    return;
  }

  if (err && typeof err === "object" && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error" });
}
