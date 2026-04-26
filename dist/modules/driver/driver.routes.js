"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const upload_1 = require("../../middleware/upload");
const driver_controller_1 = require("./driver.controller");
const router = (0, express_1.Router)();
router.get("/nearby", auth_1.protect, driver_controller_1.nearbyDrivers);
router.use(auth_1.protect, (0, auth_1.restrictTo)("DRIVER"));
router.get("/profile", driver_controller_1.profile);
router.patch("/status", driver_controller_1.setStatus);
router.patch("/location", driver_controller_1.updateLocation);
router.post("/docs", upload_1.upload.fields([
    { name: "licenseDoc", maxCount: 1 },
    { name: "vehicleDoc", maxCount: 1 },
]), driver_controller_1.uploadDocs);
router.post("/vehicle", driver_controller_1.vehicle);
router.get("/earnings", driver_controller_1.earnings);
router.get("/rides", driver_controller_1.myRides);
exports.default = router;
