import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getNotionSchema,
} from "../controllers/productsController.js";

export const productsRouter = Router();

productsRouter.get("/", listProducts);
productsRouter.get("/_schema", getNotionSchema);
productsRouter.get("/:id", getProduct);
productsRouter.post("/", createProduct);
productsRouter.put("/:id", updateProduct);
productsRouter.patch("/:id", updateProduct);
productsRouter.delete("/:id", deleteProduct);
