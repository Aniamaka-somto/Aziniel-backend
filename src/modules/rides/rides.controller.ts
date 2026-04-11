import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { getActiveRide, getDriverActiveRide, rateRide } from "./rides.service";
import { sendSuccess } from "../../utils/response";
import { AppError } from "../../utils/errors";

export const activeRide = async (req: AuthRequest, res: Response) => {
  const ride = await getActiveRide(req.user!.userId);
  sendSuccess(res, ride, "Active ride fetched");
};

export const driverActiveRide = async (req: AuthRequest, res: Response) => {
  const ride = await getDriverActiveRide(req.user!.userId);
  sendSuccess(res, ride, "Active ride fetched");
};

export const rate = async (req: AuthRequest, res: Response) => {
  const raw = req.params.id;
  const bookingId = Array.isArray(raw) ? raw[0] : raw;
  if (!bookingId) throw new AppError("Invalid booking id", 400);
  const result = await rateRide(bookingId, req.user!.userId, req.body.rating);
  sendSuccess(res, result, "Rating submitted");
};
