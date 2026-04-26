import { Router } from "express";
import { register, login, me, savePushToken } from "./auth.controller";
import { protect } from "../../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.patch("/push-token", protect, savePushToken);

export default router;
