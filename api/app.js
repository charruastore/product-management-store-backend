import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import apiRouter from "./routes/index.js";

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const code = req.headers["x-access-code"] || req.body?.accessCode;
    if (!process.env.ACCESS_CODE || code !== process.env.ACCESS_CODE) {
      return res.status(401).json({ error: "bad access code" });
    }
  }
  next();
});

app.use("/api", apiRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "server_error" });
});

export default app;
