import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import { AppError } from "./utils/errors";
import { sendError } from "./utils/response";
import { initSocket } from "./socket";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import bookingRoutes from "./modules/bookings/bookings.routes";
import driverRoutes from "./modules/driver/driver.routes";
import placesRoutes from "./modules/places/places.routes";
import ridesRoutes from "./modules/rides/rides.routes";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Init socket
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/driver", driverRoutes);
app.use("/api/v1/places", placesRoutes);
app.use("/api/v1/rides", ridesRoutes);

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "Azinel API is running 🚀" });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }
  console.error(err);
  return sendError(res, "Internal server error", 500);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
