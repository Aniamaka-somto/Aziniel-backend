import { Router } from "express";
import { protect, restrictTo } from "../../middleware/auth";
import { upload } from "../../middleware/upload";
import {
  profile,
  setStatus,
  updateLocation,
  uploadDocs,
  vehicle,
  earnings,
  myRides,
  nearbyDrivers,
} from "./driver.controller";

const router = Router();


router.get("/nearby", protect, nearbyDrivers);
router.use(protect, restrictTo("DRIVER"));

router.get("/profile", profile);
router.patch("/status", setStatus);
router.patch("/location", updateLocation);
router.post(
  "/docs",
  upload.fields([
    { name: "licenseDoc", maxCount: 1 },
    { name: "vehicleDoc", maxCount: 1 },
  ]),
  uploadDocs,
);
router.post("/vehicle", vehicle);
router.get("/earnings", earnings);
router.get("/rides", myRides);

export default router;
