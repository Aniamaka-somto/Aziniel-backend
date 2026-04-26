"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const bookings_controller_1 = require("./bookings.controller");
const router = (0, express_1.Router)();
router.post("/", auth_1.protect, bookings_controller_1.create);
router.get("/my", auth_1.protect, bookings_controller_1.myBookings);
// Must be before "/:id" so "driver" is not captured as an id
router.get("/driver/available", auth_1.protect, (0, auth_1.restrictTo)("DRIVER"), bookings_controller_1.available);
router.get("/:id", auth_1.protect, bookings_controller_1.getOne);
router.patch("/:id/cancel", auth_1.protect, bookings_controller_1.cancel);
router.patch("/:id/accept", auth_1.protect, (0, auth_1.restrictTo)("DRIVER"), bookings_controller_1.accept);
router.patch("/:id/complete", auth_1.protect, (0, auth_1.restrictTo)("DRIVER"), bookings_controller_1.complete);
router.post("/estimate", auth_1.protect, bookings_controller_1.estimatePrice);
router.patch("/:id/decline", auth_1.protect, (0, auth_1.restrictTo)("DRIVER"), bookings_controller_1.decline);
exports.default = router;
