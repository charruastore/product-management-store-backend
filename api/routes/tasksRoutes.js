import { Router } from "express";
import {
  createTask,
  listTasks,
  updateTaskStatus,
  getTask,
} from "../controllers/tasksController.js";

export const tasksRouter = Router();

tasksRouter.post("/", createTask);
tasksRouter.get("/", listTasks);
tasksRouter.get("/:id", getTask);
tasksRouter.post("/:id/status", updateTaskStatus);
