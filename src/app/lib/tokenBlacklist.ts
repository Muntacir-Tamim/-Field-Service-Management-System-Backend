import crypto from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { redisClient } from "./redis";

const PREFIX = "token:blacklist:";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const blacklistToken = async (token: string) => {
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded?.exp) return;

  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return;

  await redisClient.set(PREFIX + hashToken(token), "1", { EX: ttl });
};

const isTokenBlacklisted = async (token: string) => {
  const exists = await redisClient.exists(PREFIX + hashToken(token));
  return exists === 1;
};

export const TokenBlacklist = {
  blacklistToken,
  isTokenBlacklisted,
};
