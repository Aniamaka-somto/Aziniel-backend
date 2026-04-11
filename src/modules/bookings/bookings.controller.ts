import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getAvailableBookings,
  acceptBooking,
  completeBooking,
} from "./bookings.service";
import { sendSuccess } from "../../utils/response";
import { getIO } from "../../socket";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../../utils/errors";

const prisma = new PrismaClient();

function bookingIdParam(req: AuthRequest): string {
  const raw = req.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) throw new AppError("Invalid booking id", 400);
  return id;
}

export const create = async (req: AuthRequest, res: Response) => {
  const booking = await createBooking(req.user!.userId, req.body);
  getIO().emit("booking:new", booking);
  sendSuccess(res, booking, "Booking created", 201);
};

export const myBookings = async (req: AuthRequest, res: Response) => {
  const bookings = await getUserBookings(req.user!.userId);
  sendSuccess(res, bookings, "Bookings fetched");
};

export const getOne = async (req: AuthRequest, res: Response) => {
  const booking = await getBookingById(
    bookingIdParam(req),
    req.user!.userId,
  );
  sendSuccess(res, booking, "Booking fetched");
};

export const cancel = async (req: AuthRequest, res: Response) => {
  const booking = await cancelBooking(bookingIdParam(req), req.user!.userId);
  getIO()
    .to(`booking:${booking.id}`)
    .emit("ride:cancelled", { bookingId: booking.id });
  sendSuccess(res, booking, "Booking cancelled");
};

export const available = async (_req: AuthRequest, res: Response) => {
  const bookings = await getAvailableBookings();
  sendSuccess(res, bookings, "Available bookings");
};

export const accept = async (req: AuthRequest, res: Response) => {
  const driver = await prisma.driver.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!driver) throw new AppError("Driver profile not found", 404);

  const booking = await acceptBooking(bookingIdParam(req), driver.id);
  getIO().to(`user:${booking.userId}`).emit("ride:accepted", booking);
  sendSuccess(res, booking, "Booking accepted");
};

export const complete = async (req: AuthRequest, res: Response) => {
  const driver = await prisma.driver.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!driver) throw new AppError("Driver profile not found", 404);

  const booking = await completeBooking(bookingIdParam(req), driver.id);
  getIO().to(`booking:${booking.id}`).emit("ride:completed", booking);
  sendSuccess(res, booking, "Booking completed");
};
