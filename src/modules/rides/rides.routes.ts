import { Router } from "express";
import { protect, restrictTo } from "../../middleware/auth";
import { activeRide, driverActiveRide, rate } from "./rides.controller";

const router = Router();

router.get("/active", protect, activeRide);
router.get("/driver/active", protect, restrictTo("DRIVER"), driverActiveRide);
router.post("/:id/rate", protect, rate);

export default router;
