import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productsController.js";

export const productsRouter = Router();

productsRouter.get("/", listProducts);
productsRouter.get("/:id", getProduct);
productsRouter.post("/", createProduct);
productsRouter.put("/:id", updateProduct);
productsRouter.patch("/:id", updateProduct);
productsRouter.delete("/:id", deleteProduct);
