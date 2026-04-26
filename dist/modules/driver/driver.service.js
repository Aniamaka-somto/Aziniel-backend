"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyDrivers = exports.getDriverBookings = exports.getDriverEarnings = exports.addOrUpdateVehicle = exports.uploadDriverDocs = exports.updateDriverLocation = exports.updateDriverStatus = exports.getDriverProfile = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../../utils/errors");
const prisma = new client_1.PrismaClient();
const getDriverProfile = async (userId) => {
    const driver = await prisma.driver.findUnique({
        where: { userId },
        include: { user: true, vehicle: true },
    });
    if (!driver)
        throw new errors_1.AppError("Driver profile not found", 404);
    return driver;
};
exports.getDriverProfile = getDriverProfile;
const updateDriverStatus = async (userId, status) => {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver)
        throw new errors_1.AppError("Driver profile not found", 404);
    return prisma.driver.update({
        where: { userId },
        data: { status },
    });
};
exports.updateDriverStatus = updateDriverStatus;
const updateDriverLocation = async (userId, lat, lng) => {
    return prisma.driver.update({
        where: { userId },
        data: { currentLat: lat, currentLng: lng },
    });
};
exports.updateDriverLocation = updateDriverLocation;
const uploadDriverDocs = async (userId, licenseDoc, vehicleDoc, licenseNumber) => {
    return prisma.driver.update({
        where: { userId },
        data: {
            ...(licenseDoc && { licenseDoc }),
            ...(vehicleDoc && { vehicleDoc }),
            ...(licenseNumber && { licenseNumber }),
        },
    });
};
exports.uploadDriverDocs = uploadDriverDocs;
const addOrUpdateVehicle = async (userId, data) => {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver)
        throw new errors_1.AppError("Driver profile not found", 404);
    return prisma.vehicle.upsert({
        where: { driverId: driver.id },
        update: data,
        create: { ...data, driverId: driver.id },
    });
};
exports.addOrUpdateVehicle = addOrUpdateVehicle;
const getDriverEarnings = async (userId) => {
    const driver = await prisma.driver.findUnique({
        where: { userId },
        include: {
            earnings: {
                orderBy: { createdAt: "desc" },
                take: 50,
            },
        },
    });
    if (!driver)
        throw new errors_1.AppError("Driver profile not found", 404);
    return {
        totalEarnings: driver.totalEarnings,
        earnings: driver.earnings,
    };
};
exports.getDriverEarnings = getDriverEarnings;
const getDriverBookings = async (userId) => {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver)
        throw new errors_1.AppError("Driver profile not found", 404);
    return prisma.booking.findMany({
        where: { driverId: driver.id },
        orderBy: { createdAt: "desc" },
        include: { user: true },
    });
};
exports.getDriverBookings = getDriverBookings;
const getNearbyDrivers = async (lat, lng, radiusKm = 5) => {
    const drivers = await prisma.driver.findMany({
        where: {
            status: "ONLINE",
            currentLat: { not: null },
            currentLng: { not: null },
        },
        include: {
            vehicle: true,
            user: { select: { fullName: true, avatar: true } },
        },
    });
    const nearby = drivers.filter((driver) => {
        if (!driver.currentLat || !driver.currentLng)
            return false;
        return getDistanceKm(lat, lng, driver.currentLat, driver.currentLng) <= radiusKm;
    });
    return nearby.map((d) => ({
        id: d.id,
        latitude: d.currentLat,
        longitude: d.currentLng,
        vehicleClass: d.vehicle?.class ?? "SEDAN",
        fullName: d.user.fullName,
        rating: d.rating,
    }));
};
exports.getNearbyDrivers = getNearbyDrivers;
const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
