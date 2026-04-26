"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decline = exports.estimatePrice = exports.complete = exports.available = exports.cancel = exports.getOne = exports.myBookings = exports.accept = exports.create = void 0;
const bookings_service_1 = require("./bookings.service");
const response_1 = require("../../utils/response");
const socket_1 = require("../../socket");
const client_1 = require("@prisma/client");
const errors_1 = require("../../utils/errors");
const expo_server_sdk_1 = __importDefault(require("expo-server-sdk"));
const expo = new expo_server_sdk_1.default();
const prisma = new client_1.PrismaClient();
function bookingIdParam(req) {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (!id)
        throw new errors_1.AppError("Invalid booking id", 400);
    return id;
}
const create = async (req, res) => {
    const booking = await (0, bookings_service_1.createBooking)(req.user.userId, req.body);
    // Start targeted dispatch instead of broadcasting
    if (booking.type === "RIDE" && booking.pickupLat && booking.pickupLng) {
        (0, bookings_service_1.startDispatch)(booking.id, booking.pickupLat, booking.pickupLng, (0, socket_1.getIO)());
    }
    else {
        // Intercity and logistics just broadcast to available drivers
        (0, socket_1.getIO)().emit("booking:new", booking);
    }
    (0, response_1.sendSuccess)(res, booking, "Booking created", 201);
};
exports.create = create;
// Update accept:
const accept = async (req, res) => {
    const driver = await prisma.driver.findUnique({
        where: { userId: req.user.userId },
    });
    if (!driver)
        throw new errors_1.AppError("Driver profile not found", 404);
    const booking = await (0, bookings_service_1.acceptBooking)(bookingIdParam(req), driver.id);
    // Clear dispatch queue for this booking
    (0, bookings_service_1.handleDriverAccept)(booking.id);
    // Notify passenger
    (0, socket_1.getIO)().to(`user:${booking.userId}`).emit("ride:accepted", booking);
    (0, response_1.sendSuccess)(res, booking, "Booking accepted");
};
exports.accept = accept;
const myBookings = async (req, res) => {
    const bookings = await (0, bookings_service_1.getUserBookings)(req.user.userId);
    (0, response_1.sendSuccess)(res, bookings, "Bookings fetched");
};
exports.myBookings = myBookings;
const getOne = async (req, res) => {
    const booking = await (0, bookings_service_1.getBookingById)(bookingIdParam(req), req.user.userId);
    (0, response_1.sendSuccess)(res, booking, "Booking fetched");
};
exports.getOne = getOne;
const cancel = async (req, res) => {
    const booking = await (0, bookings_service_1.cancelBooking)(bookingIdParam(req), req.user.userId);
    (0, socket_1.getIO)()
        .to(`booking:${booking.id}`)
        .emit("ride:cancelled", { bookingId: booking.id });
    (0, response_1.sendSuccess)(res, booking, "Booking cancelled");
};
exports.cancel = cancel;
const available = async (_req, res) => {
    const bookings = await (0, bookings_service_1.getAvailableBookings)();
    (0, response_1.sendSuccess)(res, bookings, "Available bookings");
};
exports.available = available;
const complete = async (req, res) => {
    const driver = await prisma.driver.findUnique({
        where: { userId: req.user.userId },
    });
    if (!driver)
        throw new errors_1.AppError("Driver profile not found", 404);
    const booking = await (0, bookings_service_1.completeBooking)(bookingIdParam(req), driver.id);
    (0, socket_1.getIO)().to(`booking:${booking.id}`).emit("ride:completed", booking);
    (0, response_1.sendSuccess)(res, booking, "Booking completed");
};
exports.complete = complete;
const estimatePrice = async (req, res) => {
    const price = (0, bookings_service_1.calculatePrice)(req.body);
    (0, response_1.sendSuccess)(res, { price }, "Price estimated");
};
exports.estimatePrice = estimatePrice;
const decline = async (req, res) => {
    const driver = await prisma.driver.findUnique({
        where: { userId: req.user.userId },
    });
    if (!driver)
        throw new errors_1.AppError("Driver profile not found", 404);
    (0, bookings_service_1.handleDriverDecline)(bookingIdParam(req), driver.id, (0, socket_1.getIO)());
    (0, response_1.sendSuccess)(res, null, "Booking declined");
};
exports.decline = decline;
