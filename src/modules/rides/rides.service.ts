import { PrismaClient } from "@prisma/client";
import { AppError } from "../../utils/errors";

const prisma = new PrismaClient();

export const getActiveRide = async (userId: string) => {
  return prisma.booking.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "CONFIRMED"] },
      type: "RIDE",
    },
    include: {
      driver: { include: { user: true, vehicle: true } },
    },
  });
};

export const getDriverActiveRide = async (userId: string) => {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new AppError("Driver not found", 404);

  return prisma.booking.findFirst({
    where: {
      driverId: driver.id,
      status: "CONFIRMED",
    },
    include: { user: true },
  });
};

export const rateRide = async (
  bookingId: string,
  userId: string,
  rating: number,
) => {
  if (rating < 1 || rating > 5)
    throw new AppError("Rating must be between 1 and 5", 400);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { driver: true },
  });

  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.userId !== userId) throw new AppError("Not your booking", 403);
  if (booking.status !== "COMPLETED")
    throw new AppError("Can only rate completed rides", 400);
  if (!booking.driverId) throw new AppError("No driver on this booking", 400);

  const driver = await prisma.driver.findUnique({
    where: { id: booking.driverId },
  });
  if (!driver) throw new AppError("Driver not found", 404);

  const newTotal = driver.totalRatings + 1;
  const newRating = (driver.rating * driver.totalRatings + rating) / newTotal;

  await prisma.driver.update({
    where: { id: driver.id },
    data: { rating: newRating, totalRatings: newTotal },
  });

  return { message: "Rating submitted" };
};
