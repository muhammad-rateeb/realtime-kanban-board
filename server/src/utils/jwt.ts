import jwt from "jsonwebtoken";
import { env } from "../env.js";

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d" });
}
