"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const errors_1 = require("./utils/errors");
const response_1 = require("./utils/response");
const socket_1 = require("./socket");
// Routes
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const bookings_routes_1 = __importDefault(require("./modules/bookings/bookings.routes"));
const driver_routes_1 = __importDefault(require("./modules/driver/driver.routes"));
const places_routes_1 = __importDefault(require("./modules/places/places.routes"));
const rides_routes_1 = __importDefault(require("./modules/rides/rides.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Init socket
(0, socket_1.initSocket)(server);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use("/api/v1/auth", auth_routes_1.default);
app.use("/api/v1/bookings", bookings_routes_1.default);
app.use("/api/v1/driver", driver_routes_1.default);
app.use("/api/v1/places", places_routes_1.default);
app.use("/api/v1/rides", rides_routes_1.default);
// Health check
app.get("/", (_req, res) => {
    res.json({ status: "Azinel API is running 🚀" });
});
// Global error handler
app.use((err, _req, res, _next) => {
    if (err instanceof errors_1.AppError) {
        return (0, response_1.sendError)(res, err.message, err.statusCode);
    }
    console.error(err);
    return (0, response_1.sendError)(res, "Internal server error", 500);
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
