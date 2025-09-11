import { Router } from "express";
import { usersRouter } from "./usersRoutes.js";
import { productsRouter } from "./productsRoutes.js";
import { healthRouter } from "./healthRoutes.js";

const router = Router();

router.use("/users", usersRouter);
router.use("/products", productsRouter);
router.use("/health", healthRouter);
export default router;
