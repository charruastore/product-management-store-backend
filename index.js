import "dotenv/config";
import { ENV } from "./config/env.js";
import app from "./api/app.js";
import { startScheduler } from "./jobs/scheduler.js";

const PORT = ENV.PORT || process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  startScheduler();
});
