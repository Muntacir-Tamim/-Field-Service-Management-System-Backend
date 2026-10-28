import { createClient } from "redis";
import config from "../config";

export const redisClient = createClient({
  username: config.redis_user,
  password: config.redis_password,
  socket: {
    host: config.redis_host,
    port: Number(config.redis_port),
    keepAlive: true,
    connectTimeout: 10000,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
  pingInterval: 30000,
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});
redisClient.on("reconnecting", () => console.log("Redis reconnecting..."));
redisClient.on("ready", () => console.log("Redis ready"));
