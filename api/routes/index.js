import { Router } from "express";
import { tasksRouter } from "./tasksRoutes.js";
import { usersRouter } from "./usersRoutes.js";

const router = Router();

router.use("/tasks", tasksRouter);
router.use("/users", usersRouter);

export default router;
