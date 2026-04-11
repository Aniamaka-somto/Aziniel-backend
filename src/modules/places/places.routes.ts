import { Router } from "express";
import { protect } from "../../middleware/auth";
import { searchPlaces, getPlaceDetails } from "./places.controller";

const router = Router();

router.get("/search", protect, searchPlaces);
router.get("/details/:placeId", protect, getPlaceDetails);

export default router;
