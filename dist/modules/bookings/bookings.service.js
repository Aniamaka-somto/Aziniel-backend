"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDriverAccept = exports.handleDriverDecline = exports.startDispatch = exports.completeBooking = exports.acceptBooking = exports.getAvailableBookings = exports.cancelBooking = exports.getBookingById = exports.getUserBookings = exports.createBooking = void 0;
exports.calculatePrice = calculatePrice;
const client_1 = require("@prisma/client");
const errors_1 = require("../../utils/errors");
const prisma = new client_1.PrismaClient();
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function calculatePrice(data) {
    const BASE_FARE = {
        Bolt: 300,
        Comfort: 500,
        XL: 700,
    };
    const PER_KM = {
        Bolt: 150,
        Comfort: 220,
        XL: 280,
    };
    const INTERCITY_BASE = {
        SEDAN: 15000,
        SUV: 25000,
    };
    const INTERCITY_PER_KM = {
        SEDAN: 80,
        SUV: 120,
    };
    const LOGISTICS_BASE = {
        DOCUMENT: 800,
        SMALL_PARCEL: 1200,
        LARGE_PARCEL: 2000,
        FRAGILE: 2500,
        ELECTRONICS: 3000,
    };
    if (data.type === "RIDE") {
        const rideType = data.rideType ?? "Bolt";
        const base = BASE_FARE[rideType] ?? 300;
        const perKm = PER_KM[rideType] ?? 150;
        if (data.pickupLat && data.pickupLng && data.destLat && data.destLng) {
            const distance = calculateDistance(data.pickupLat, data.pickupLng, data.destLat, data.destLng);
            return Math.round(base + distance * perKm);
        }
        return base + 5 * perKm; // fallback 5km
    }
    if (data.type === "INTERCITY") {
        const cls = data.vehicleClass?.toUpperCase() ?? "SEDAN";
        const base = INTERCITY_BASE[cls] ?? 15000;
        const perKm = INTERCITY_PER_KM[cls] ?? 80;
        if (data.pickupLat && data.pickupLng && data.destLat && data.destLng) {
            const distance = calculateDistance(data.pickupLat, data.pickupLng, data.destLat, data.destLng);
            return Math.round(base + distance * perKm);
        }
        return base;
    }
    if (data.type === "LOGISTICS") {
        const cat = data.itemCategory?.toUpperCase() ?? "SMALL_PARCEL";
        const base = LOGISTICS_BASE[cat] ?? 1200;
        const weightCharge = (data.itemWeight ?? 1) * 200;
        if (data.pickupLat && data.pickupLng && data.destLat && data.destLng) {
            const distance = calculateDistance(data.pickupLat, data.pickupLng, data.destLat, data.destLng);
            return Math.round(base + weightCharge + distance * 50);
        }
        return base + weightCharge;
    }
    return 1500;
}
const createBooking = async (userId, data) => {
    const estimatedPrice = data.estimatedPrice ??
        calculatePrice({
            type: data.type,
            pickupLat: data.pickupLat,
            pickupLng: data.pickupLng,
            destLat: data.destLat,
            destLng: data.destLng,
            rideType: data.rideType,
            vehicleClass: data.vehicleClass,
            itemWeight: data.itemWeight,
            itemCategory: data.itemCategory,
            passengers: data.passengers,
        });
    const itemCategory = data.itemCategory;
    const vehicleClass = data.vehicleClass;
    const booking = await prisma.booking.create({
        data: {
            userId,
            type: data.type,
            estimatedPrice,
            pickupLat: data.pickupLat,
            pickupLng: data.pickupLng,
            pickupAddress: data.pickupAddress,
            destLat: data.destLat,
            destLng: data.destLng,
            destAddress: data.destAddress,
            rideType: data.rideType,
            originCity: data.originCity,
            originArea: data.originArea,
            originAreaLat: data.originAreaLat,
            originAreaLng: data.originAreaLng,
            destCity: data.destCity,
            destArea: data.destArea,
            destAreaLat: data.destAreaLat,
            destAreaLng: data.destAreaLng,
            departureDate: data.departureDate,
            departureTime: data.departureTime,
            vehicleClass,
            passengers: data.passengers,
            itemCategory,
            itemWeight: data.itemWeight,
            itemDescription: data.itemDescription,
            receiverName: data.receiverName,
            receiverPhone: data.receiverPhone,
        },
        include: { user: true, driver: { include: { user: true, vehicle: true } } },
    });
    return booking;
};
exports.createBooking = createBooking;
const getUserBookings = async (userId) => {
    return prisma.booking.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { driver: { include: { user: true, vehicle: true } } },
    });
};
exports.getUserBookings = getUserBookings;
const getBookingById = async (id, userId) => {
    const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
            user: true,
            driver: { include: { user: true, vehicle: true } },
        },
    });
    if (!booking)
        throw new errors_1.AppError("Booking not found", 404);
    if (booking.userId !== userId)
        throw new errors_1.AppError("Not your booking", 403);
    return booking;
};
exports.getBookingById = getBookingById;
const cancelBooking = async (id, userId) => {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
        throw new errors_1.AppError("Booking not found", 404);
    if (booking.userId !== userId)
        throw new errors_1.AppError("Not your booking", 403);
    if (booking.status === "COMPLETED")
        throw new errors_1.AppError("Cannot cancel completed booking", 400);
    if (booking.status === "CANCELLED")
        throw new errors_1.AppError("Already cancelled", 400);
    return prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
    });
};
exports.cancelBooking = cancelBooking;
const getAvailableBookings = async () => {
    return prisma.booking.findMany({
        where: { status: "PENDING", driverId: null },
        orderBy: { createdAt: "desc" },
        include: { user: true },
    });
};
exports.getAvailableBookings = getAvailableBookings;
const acceptBooking = async (bookingId, driverId) => {
    // Use a transaction to prevent race conditions
    return prisma.$transaction(async (tx) => {
        // Lock the booking row and recheck status atomically
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking)
            throw new errors_1.AppError("Booking not found", 404);
        if (booking.status !== "PENDING")
            throw new errors_1.AppError("Booking no longer available", 400);
        if (booking.driverId)
            throw new errors_1.AppError("Booking already taken by another driver", 409);
        // Update atomically — if two drivers hit this simultaneously
        // only one will succeed because of the where clause check
        const updated = await tx.booking.updateMany({
            where: {
                id: bookingId,
                status: "PENDING", // double-check inside transaction
                driverId: null, // double-check inside transaction
            },
            data: { driverId, status: "CONFIRMED" },
        });
        // If 0 rows updated, another driver got there first
        if (updated.count === 0) {
            throw new errors_1.AppError("Booking was just taken by another driver", 409);
        }
        // Return the full booking
        return tx.booking.findUnique({
            where: { id: bookingId },
            include: {
                user: true,
                driver: { include: { user: true, vehicle: true } },
            },
        });
    });
};
exports.acceptBooking = acceptBooking;
const completeBooking = async (bookingId, driverId) => {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking)
        throw new errors_1.AppError("Booking not found", 404);
    if (booking.driverId !== driverId)
        throw new errors_1.AppError("Not your booking", 403);
    if (booking.status !== "CONFIRMED")
        throw new errors_1.AppError("Booking is not confirmed", 400);
    const [updated] = await prisma.$transaction([
        prisma.booking.update({
            where: { id: bookingId },
            data: { status: "COMPLETED", finalPrice: booking.estimatedPrice },
        }),
        prisma.driver.update({
            where: { id: driverId },
            data: { totalEarnings: { increment: booking.estimatedPrice } },
        }),
        prisma.earning.create({
            data: { driverId, bookingId, amount: booking.estimatedPrice },
        }),
    ]);
    return updated;
};
exports.completeBooking = completeBooking;
// In-memory dispatch queue
// Key: bookingId, Value: array of driver IDs sorted by distance
const dispatchQueue = new Map();
const dispatchTimers = new Map();
const startDispatch = async (bookingId, pickupLat, pickupLng, io) => {
    // Get all online drivers sorted by distance
    const drivers = await prisma.driver.findMany({
        where: {
            status: "ONLINE",
            currentLat: { not: null },
            currentLng: { not: null },
            isVerified: true,
        },
        include: {
            user: true,
            vehicle: true,
        },
    });
    if (drivers.length === 0) {
        // No drivers available — notify passenger
        io.to(`booking:${bookingId}`).emit("booking:no_drivers", {
            bookingId,
            message: "No drivers available right now. Please try again.",
        });
        return;
    }
    // Sort by distance to pickup
    const sorted = drivers
        .map((d) => ({
        ...d,
        distance: getDistanceKm(pickupLat, pickupLng, d.currentLat, d.currentLng),
    }))
        .filter((d) => d.distance <= 10) // only within 10km
        .sort((a, b) => a.distance - b.distance);
    if (sorted.length === 0) {
        io.to(`booking:${bookingId}`).emit("booking:no_drivers", {
            bookingId,
            message: "No drivers nearby. Please try again in a moment.",
        });
        return;
    }
    // Store the queue
    dispatchQueue.set(bookingId, sorted.map((d) => d.id));
    // Start dispatching to first driver
    dispatchToNextDriver(bookingId, io);
};
exports.startDispatch = startDispatch;
const dispatchToNextDriver = async (bookingId, io) => {
    const queue = dispatchQueue.get(bookingId);
    if (!queue || queue.length === 0) {
        // All drivers declined or timed out
        dispatchQueue.delete(bookingId);
        io.to(`booking:${bookingId}`).emit("booking:no_drivers", {
            bookingId,
            message: "No drivers accepted your request. Please try again.",
        });
        return;
    }
    const driverId = queue[0];
    // Get the booking to make sure it's still pending
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true },
    });
    if (!booking || booking.status !== "PENDING") {
        // Already accepted or cancelled
        dispatchQueue.delete(bookingId);
        dispatchTimers.delete(bookingId);
        return;
    }
    // Get driver details
    const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: { user: true, vehicle: true },
    });
    if (!driver) {
        // Driver no longer exists, skip
        queue.shift();
        dispatchQueue.set(bookingId, queue);
        dispatchToNextDriver(bookingId, io);
        return;
    }
    console.log(`Dispatching booking ${bookingId} to driver ${driver.user.fullName}`);
    // Send to this specific driver only
    io.to(`driver:${driverId}`).emit("booking:request", {
        ...booking,
        timeoutSeconds: 15, // driver has 15 seconds
    });
    // Notify passenger which driver we're trying
    io.to(`booking:${bookingId}`).emit("booking:dispatching", {
        bookingId,
        message: "Finding your driver...",
        attempt: (dispatchQueue.get(bookingId) ?? []).length,
    });
    // Start 15 second timeout for this driver
    const timer = setTimeout(async () => {
        console.log(`Driver ${driverId} timed out for booking ${bookingId}`);
        // Tell driver the request expired
        io.to(`driver:${driverId}`).emit("booking:request_expired", { bookingId });
        // Remove this driver from queue and try next
        const currentQueue = dispatchQueue.get(bookingId) ?? [];
        const newQueue = currentQueue.filter((id) => id !== driverId);
        dispatchQueue.set(bookingId, newQueue);
        dispatchToNextDriver(bookingId, io);
    }, 15000);
    dispatchTimers.set(bookingId, timer);
};
const handleDriverDecline = (bookingId, driverId, io) => {
    // Clear the timeout for this driver
    const timer = dispatchTimers.get(bookingId);
    if (timer) {
        clearTimeout(timer);
        dispatchTimers.delete(bookingId);
    }
    // Remove declined driver from queue
    const queue = dispatchQueue.get(bookingId) ?? [];
    const newQueue = queue.filter((id) => id !== driverId);
    dispatchQueue.set(bookingId, newQueue);
    console.log(`Driver ${driverId} declined booking ${bookingId}, trying next...`);
    // Try next driver immediately
    dispatchToNextDriver(bookingId, io);
};
exports.handleDriverDecline = handleDriverDecline;
const handleDriverAccept = (bookingId) => {
    // Clear timeout and queue when a driver accepts
    const timer = dispatchTimers.get(bookingId);
    if (timer) {
        clearTimeout(timer);
        dispatchTimers.delete(bookingId);
    }
    dispatchQueue.delete(bookingId);
};
exports.handleDriverAccept = handleDriverAccept;
// Helper (same as in driver service)
const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
