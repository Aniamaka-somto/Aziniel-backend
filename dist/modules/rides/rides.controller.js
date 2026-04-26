"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rate = exports.driverActiveRide = exports.activeRide = void 0;
const rides_service_1 = require("./rides.service");
const response_1 = require("../../utils/response");
const errors_1 = require("../../utils/errors");
const activeRide = async (req, res) => {
    const ride = await (0, rides_service_1.getActiveRide)(req.user.userId);
    (0, response_1.sendSuccess)(res, ride, "Active ride fetched");
};
exports.activeRide = activeRide;
const driverActiveRide = async (req, res) => {
    const ride = await (0, rides_service_1.getDriverActiveRide)(req.user.userId);
    (0, response_1.sendSuccess)(res, ride, "Active ride fetched");
};
exports.driverActiveRide = driverActiveRide;
const rate = async (req, res) => {
    const raw = req.params.id;
    const bookingId = Array.isArray(raw) ? raw[0] : raw;
    if (!bookingId)
        throw new errors_1.AppError("Invalid booking id", 400);
    const result = await (0, rides_service_1.rateRide)(bookingId, req.user.userId, req.body.rating);
    (0, response_1.sendSuccess)(res, result, "Rating submitted");
};
exports.rate = rate;
