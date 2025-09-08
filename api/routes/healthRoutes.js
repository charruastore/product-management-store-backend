import { Router } from "express";
import { healthBasic, healthNotion } from "../controllers/healthController.js";

export const healthRouter = Router();

healthRouter.get("/", healthBasic);
healthRouter.get("/notion", healthNotion);
