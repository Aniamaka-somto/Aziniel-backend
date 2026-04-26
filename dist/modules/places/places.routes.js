"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const places_controller_1 = require("./places.controller");
const router = (0, express_1.Router)();
router.get("/search", auth_1.protect, places_controller_1.searchPlaces);
router.get("/details/:placeId", auth_1.protect, places_controller_1.getPlaceDetails);
exports.default = router;
