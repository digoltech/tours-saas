import cors from "cors";
import express from "express";
import { environment } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { tenantRouter } from "./routes/tenant.routes.js";
import { managementRouter } from "./routes/management.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.routes.js";
import { transportRouter } from "./routes/transport.routes.js";
import { bookingRouter } from "./routes/booking.routes.js";
import { financeRouter } from "./routes/finance.routes.js";
import { stage4Router } from "./routes/stage4.routes.js";

export const app = express();

app.use(cors({ origin: environment.WEB_URL, credentials: true }));
app.use(express.json());
app.use((request, response, next) => {
  const startedAt = performance.now();
  response.on("finish", () => {
    const durationMs = Math.round(performance.now() - startedAt);
    const message = `${request.method} ${request.path} ${response.statusCode} ${durationMs}ms`;
    if (durationMs >= 1000) console.warn(`[slow api] ${message}`);
    else console.info(`[api] ${message}`);
  });
  next();
});
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/tenants", tenantRouter);
app.use("/api", managementRouter);
app.use("/api", transportRouter);
app.use("/api", bookingRouter);
app.use("/api", financeRouter);
app.use("/api", stage4Router);
app.use(notFoundHandler);
app.use(errorHandler);
