import cors from "cors";
import express from "express";
import { environment } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { tenantRouter } from "./routes/tenant.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use(cors({ origin: environment.WEB_URL, credentials: true }));
app.use(express.json());
app.use((request, _response, next) => {
  console.info(`${request.method} ${request.originalUrl}`);
  next();
});
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/tenants", tenantRouter);
app.use(notFoundHandler);
app.use(errorHandler);
