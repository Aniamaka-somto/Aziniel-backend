import {
  PrismaClient,
  BookingType,
  ItemCategory,
  VehicleClass,
} from "@prisma/client";
import { AppError } from "../../utils/errors";

const prisma = new PrismaClient();

type CreateBookingBody = {
  type: string;
  estimatedPrice?: number;
  pickupLat?: number;
  pickupLng?: number;
  pickupAddress?: string;
  destLat?: number;
  destLng?: number;
  destAddress?: string;
  rideType?: string;
  originCity?: string;
  originArea?: string;
  originAreaLat?: number;
  originAreaLng?: number;
  destCity?: string;
  destArea?: string;
  destAreaLat?: number;
  destAreaLng?: number;
  departureDate?: string;
  departureTime?: string;
  vehicleClass?: string;
  passengers?: number;
  itemCategory?: string;
  itemWeight?: number;
  itemDescription?: string;
  receiverName?: string;
  receiverPhone?: string;
};

export const createBooking = async (userId: string, data: CreateBookingBody) => {
  let estimatedPrice = 0;

  if (data.type === "RIDE") {
    estimatedPrice = data.estimatedPrice ?? 1500;
  } else if (data.type === "INTERCITY") {
    estimatedPrice = data.estimatedPrice ?? 8000;
  } else if (data.type === "LOGISTICS") {
    const baseRate = 2000;
    const weightRate = (data.itemWeight ?? 1) * 300;
    estimatedPrice = data.estimatedPrice ?? baseRate + weightRate;
  }

  const itemCategory = data.itemCategory as ItemCategory | undefined;
  const vehicleClass = data.vehicleClass as VehicleClass | undefined;

  const booking = await prisma.booking.create({
    data: {
      userId,
      type: data.type as BookingType,
      estimatedPrice,
      pickupLat: data.pickupLat,
      pickupLng: data.pickupLng,
      pickupAddress: data.pickupAddress,
      destLat: data.destLat,
      destLng: data.destLng,
      destAddress: data.destAddress,
      rideType: data.rideType,
      originCity: data.originCity,
      originArea: data.originArea,
      originAreaLat: data.originAreaLat,
      originAreaLng: data.originAreaLng,
      destCity: data.destCity,
      destArea: data.destArea,
      destAreaLat: data.destAreaLat,
      destAreaLng: data.destAreaLng,
      departureDate: data.departureDate,
      departureTime: data.departureTime,
      vehicleClass,
      passengers: data.passengers,
      itemCategory,
      itemWeight: data.itemWeight,
      itemDescription: data.itemDescription,
      receiverName: data.receiverName,
      receiverPhone: data.receiverPhone,
    },
    include: { user: true, driver: { include: { user: true, vehicle: true } } },
  });

  return booking;
};

export const getUserBookings = async (userId: string) => {
  return prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { driver: { include: { user: true, vehicle: true } } },
  });
};

export const getBookingById = async (id: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: true,
      driver: { include: { user: true, vehicle: true } },
    },
  });
  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.userId !== userId) throw new AppError("Not your booking", 403);
  return booking;
};

export const cancelBooking = async (id: string, userId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.userId !== userId) throw new AppError("Not your booking", 403);
  if (booking.status === "COMPLETED")
    throw new AppError("Cannot cancel completed booking", 400);
  if (booking.status === "CANCELLED")
    throw new AppError("Already cancelled", 400);

  return prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
};

export const getAvailableBookings = async () => {
  return prisma.booking.findMany({
    where: { status: "PENDING", driverId: null },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
};

export const acceptBooking = async (bookingId: string, driverId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.status !== "PENDING")
    throw new AppError("Booking no longer available", 400);
  if (booking.driverId) throw new AppError("Booking already taken", 400);

  return prisma.booking.update({
    where: { id: bookingId },
    data: { driverId, status: "CONFIRMED" },
    include: { user: true, driver: { include: { user: true, vehicle: true } } },
  });
};

export const completeBooking = async (
  bookingId: string,
  driverId: string,
) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.driverId !== driverId)
    throw new AppError("Not your booking", 403);
  if (booking.status !== "CONFIRMED")
    throw new AppError("Booking is not confirmed", 400);

  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED", finalPrice: booking.estimatedPrice },
    }),
    prisma.driver.update({
      where: { id: driverId },
      data: { totalEarnings: { increment: booking.estimatedPrice } },
    }),
    prisma.earning.create({
      data: { driverId, bookingId, amount: booking.estimatedPrice },
    }),
  ]);

  return updated;
};
