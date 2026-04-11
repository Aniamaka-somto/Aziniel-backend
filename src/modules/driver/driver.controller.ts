import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import {
  getDriverProfile,
  updateDriverStatus,
  updateDriverLocation,
  uploadDriverDocs,
  addOrUpdateVehicle,
  getDriverEarnings,
  getDriverBookings,
  getNearbyDrivers,
} from "./driver.service";
import { sendSuccess } from "../../utils/response";
import { getIO } from "../../socket";
import { DriverStatus } from "@prisma/client";

export const profile = async (req: AuthRequest, res: Response) => {
  const driver = await getDriverProfile(req.user!.userId);
  sendSuccess(res, driver, "Driver profile fetched");
};

export const setStatus = async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const driver = await updateDriverStatus(
    req.user!.userId,
    status as DriverStatus,
  );
  getIO().emit("driver:status", { driverId: driver.id, status });
  sendSuccess(res, driver, "Status updated");
};

export const updateLocation = async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, bookingId } = req.body;
  await updateDriverLocation(req.user!.userId, latitude, longitude);

  if (bookingId) {
    getIO()
      .to(`booking:${bookingId}`)
      .emit("driver:location", { latitude, longitude });
  }

  sendSuccess(res, null, "Location updated");
};

export const uploadDocs = async (req: AuthRequest, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const licenseDoc = files?.licenseDoc?.[0]?.path;
  const vehicleDoc = files?.vehicleDoc?.[0]?.path;
  const { licenseNumber } = req.body;

  const driver = await uploadDriverDocs(
    req.user!.userId,
    licenseDoc,
    vehicleDoc,
    licenseNumber,
  );
  sendSuccess(res, driver, "Documents uploaded");
};

export const vehicle = async (req: AuthRequest, res: Response) => {
  const v = await addOrUpdateVehicle(req.user!.userId, req.body);
  sendSuccess(res, v, "Vehicle saved");
};

export const earnings = async (req: AuthRequest, res: Response) => {
  const data = await getDriverEarnings(req.user!.userId);
  sendSuccess(res, data, "Earnings fetched");
};

export const myRides = async (req: AuthRequest, res: Response) => {
  const bookings = await getDriverBookings(req.user!.userId);
  sendSuccess(res, bookings, "Driver bookings fetched");
};
export const nearbyDrivers = async (req: AuthRequest, res: Response) => {
  const { lat, lng, radius } = req.query;
  const drivers = await getNearbyDrivers(
    parseFloat(lat as string),
    parseFloat(lng as string),
    radius ? parseFloat(radius as string) : 5
  );
  sendSuccess(res, drivers, "Nearby drivers fetched");
};