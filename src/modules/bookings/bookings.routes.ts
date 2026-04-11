import { Router } from "express";
import { protect, restrictTo } from "../../middleware/auth";
import {
  create,
  myBookings,
  getOne,
  cancel,
  available,
  accept,
  complete,
} from "./bookings.controller";

const router = Router();

router.post("/", protect, create);
router.get("/my", protect, myBookings);

// Must be before "/:id" so "driver" is not captured as an id
router.get("/driver/available", protect, restrictTo("DRIVER"), available);

router.get("/:id", protect, getOne);
router.patch("/:id/cancel", protect, cancel);
router.patch("/:id/accept", protect, restrictTo("DRIVER"), accept);
router.patch("/:id/complete", protect, restrictTo("DRIVER"), complete);

export default router;
