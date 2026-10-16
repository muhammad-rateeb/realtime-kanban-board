import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { formatIssues } from "../errors.js";

export function validate(schema: ZodTypeAny, source: "body" | "query" | "params" = "body"): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({ error: "Validation failed", issues: formatIssues(result.error.issues) });
      return;
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
