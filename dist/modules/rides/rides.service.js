"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateRide = exports.getDriverActiveRide = exports.getActiveRide = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../../utils/errors");
const prisma = new client_1.PrismaClient();
const getActiveRide = async (userId) => {
    return prisma.booking.findFirst({
        where: {
            userId,
            status: { in: ["PENDING", "CONFIRMED"] },
            type: "RIDE",
        },
        include: {
            driver: { include: { user: true, vehicle: true } },
        },
    });
};
exports.getActiveRide = getActiveRide;
const getDriverActiveRide = async (userId) => {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver)
        throw new errors_1.AppError("Driver not found", 404);
    return prisma.booking.findFirst({
        where: {
            driverId: driver.id,
            status: "CONFIRMED",
        },
        include: { user: true },
    });
};
exports.getDriverActiveRide = getDriverActiveRide;
const rateRide = async (bookingId, userId, rating) => {
    if (rating < 1 || rating > 5)
        throw new errors_1.AppError("Rating must be between 1 and 5", 400);
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { driver: true },
    });
    if (!booking)
        throw new errors_1.AppError("Booking not found", 404);
    if (booking.userId !== userId)
        throw new errors_1.AppError("Not your booking", 403);
    if (booking.status !== "COMPLETED")
        throw new errors_1.AppError("Can only rate completed rides", 400);
    if (!booking.driverId)
        throw new errors_1.AppError("No driver on this booking", 400);
    const driver = await prisma.driver.findUnique({
        where: { id: booking.driverId },
    });
    if (!driver)
        throw new errors_1.AppError("Driver not found", 404);
    const newTotal = driver.totalRatings + 1;
    const newRating = (driver.rating * driver.totalRatings + rating) / newTotal;
    await prisma.driver.update({
        where: { id: driver.id },
        data: { rating: newRating, totalRatings: newTotal },
    });
    return { message: "Rating submitted" };
};
exports.rateRide = rateRide;
