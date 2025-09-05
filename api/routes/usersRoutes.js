import { Router } from "express";
import { listCachedUsers, refreshUsersCache } from "../services/usersCache.js";

export const usersRouter = Router();

usersRouter.get("/", async (_req, res) => {
  const users = await listCachedUsers();
  res.json({ count: users.length, users });
});

usersRouter.post("/refresh", async (_req, res) => {
  const r = await refreshUsersCache();
  res.json(r);
});
