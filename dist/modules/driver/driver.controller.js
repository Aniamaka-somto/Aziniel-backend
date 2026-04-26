"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearbyDrivers = exports.myRides = exports.earnings = exports.vehicle = exports.uploadDocs = exports.updateLocation = exports.setStatus = exports.profile = void 0;
const driver_service_1 = require("./driver.service");
const response_1 = require("../../utils/response");
const socket_1 = require("../../socket");
const profile = async (req, res) => {
    const driver = await (0, driver_service_1.getDriverProfile)(req.user.userId);
    (0, response_1.sendSuccess)(res, driver, "Driver profile fetched");
};
exports.profile = profile;
const setStatus = async (req, res) => {
    const { status } = req.body;
    const driver = await (0, driver_service_1.updateDriverStatus)(req.user.userId, status);
    (0, socket_1.getIO)().emit("driver:status", { driverId: driver.id, status });
    (0, response_1.sendSuccess)(res, driver, "Status updated");
};
exports.setStatus = setStatus;
const updateLocation = async (req, res) => {
    const { latitude, longitude, bookingId } = req.body;
    await (0, driver_service_1.updateDriverLocation)(req.user.userId, latitude, longitude);
    if (bookingId) {
        (0, socket_1.getIO)()
            .to(`booking:${bookingId}`)
            .emit("driver:location", { latitude, longitude });
    }
    (0, response_1.sendSuccess)(res, null, "Location updated");
};
exports.updateLocation = updateLocation;
const uploadDocs = async (req, res) => {
    const files = req.files;
    const licenseDoc = files?.licenseDoc?.[0]?.path;
    const vehicleDoc = files?.vehicleDoc?.[0]?.path;
    const { licenseNumber } = req.body;
    const driver = await (0, driver_service_1.uploadDriverDocs)(req.user.userId, licenseDoc, vehicleDoc, licenseNumber);
    (0, response_1.sendSuccess)(res, driver, "Documents uploaded");
};
exports.uploadDocs = uploadDocs;
const vehicle = async (req, res) => {
    const v = await (0, driver_service_1.addOrUpdateVehicle)(req.user.userId, req.body);
    (0, response_1.sendSuccess)(res, v, "Vehicle saved");
};
exports.vehicle = vehicle;
const earnings = async (req, res) => {
    const data = await (0, driver_service_1.getDriverEarnings)(req.user.userId);
    (0, response_1.sendSuccess)(res, data, "Earnings fetched");
};
exports.earnings = earnings;
const myRides = async (req, res) => {
    const bookings = await (0, driver_service_1.getDriverBookings)(req.user.userId);
    (0, response_1.sendSuccess)(res, bookings, "Driver bookings fetched");
};
exports.myRides = myRides;
const nearbyDrivers = async (req, res) => {
    const { lat, lng, radius } = req.query;
    const drivers = await (0, driver_service_1.getNearbyDrivers)(parseFloat(lat), parseFloat(lng), radius ? parseFloat(radius) : 5);
    (0, response_1.sendSuccess)(res, drivers, "Nearby drivers fetched");
};
exports.nearbyDrivers = nearbyDrivers;
