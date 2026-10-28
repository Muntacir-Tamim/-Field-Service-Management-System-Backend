import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import httpStatus from "http-status";

const handler = (_req: Request, res: Response) => {
  res.status(httpStatus.TOO_MANY_REQUESTS).json({
    success: false,
    message: "Too many requests, please try again later.",
    errors: [],
  });
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});
