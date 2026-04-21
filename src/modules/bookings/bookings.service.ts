import {
  PrismaClient,
  BookingType,
  ItemCategory,
  VehicleClass,
} from "@prisma/client";
import { AppError } from "../../utils/errors";

const prisma = new PrismaClient();

// Add at the top of bookings.service.ts
interface PricingInput {
  type: string;
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  rideType?: string;
  vehicleClass?: string;
  itemWeight?: number;
  itemCategory?: string;
  passengers?: number;
}

function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculatePrice(data: PricingInput): number {
  const BASE_FARE: Record<string, number> = {
    Bolt: 300,
    Comfort: 500,
    XL: 700,
  };

  const PER_KM: Record<string, number> = {
    Bolt: 150,
    Comfort: 220,
    XL: 280,
  };

  const INTERCITY_BASE: Record<string, number> = {
    SEDAN: 15000,
    SUV: 25000,
  };

  const INTERCITY_PER_KM: Record<string, number> = {
    SEDAN: 80,
    SUV: 120,
  };

  const LOGISTICS_BASE: Record<string, number> = {
    DOCUMENT: 800,
    SMALL_PARCEL: 1200,
    LARGE_PARCEL: 2000,
    FRAGILE: 2500,
    ELECTRONICS: 3000,
  };

  if (data.type === "RIDE") {
    const rideType = data.rideType ?? "Bolt";
    const base = BASE_FARE[rideType] ?? 300;
    const perKm = PER_KM[rideType] ?? 150;

    if (data.pickupLat && data.pickupLng && data.destLat && data.destLng) {
      const distance = calculateDistance(
        data.pickupLat, data.pickupLng,
        data.destLat, data.destLng
      );
      return Math.round(base + distance * perKm);
    }
    return base + 5 * perKm; // fallback 5km
  }

  if (data.type === "INTERCITY") {
    const cls = data.vehicleClass?.toUpperCase() ?? "SEDAN";
    const base = INTERCITY_BASE[cls] ?? 15000;
    const perKm = INTERCITY_PER_KM[cls] ?? 80;

    if (data.pickupLat && data.pickupLng && data.destLat && data.destLng) {
      const distance = calculateDistance(
        data.pickupLat, data.pickupLng,
        data.destLat, data.destLng
      );
      return Math.round(base + distance * perKm);
    }
    return base;
  }

  if (data.type === "LOGISTICS") {
    const cat = data.itemCategory?.toUpperCase() ?? "SMALL_PARCEL";
    const base = LOGISTICS_BASE[cat] ?? 1200;
    const weightCharge = (data.itemWeight ?? 1) * 200;

    if (data.pickupLat && data.pickupLng && data.destLat && data.destLng) {
      const distance = calculateDistance(
        data.pickupLat, data.pickupLng,
        data.destLat, data.destLng
      );
      return Math.round(base + weightCharge + distance * 50);
    }
    return base + weightCharge;
  }

  return 1500;
}

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

// Replace the if/else price block with:
const estimatedPrice = data.estimatedPrice ?? calculatePrice({
  type: data.type,
  pickupLat: data.pickupLat,
  pickupLng: data.pickupLng,
  destLat: data.destLat,
  destLng: data.destLng,
  rideType: data.rideType,
  vehicleClass: data.vehicleClass,
  itemWeight: data.itemWeight,
  itemCategory: data.itemCategory,
  passengers: data.passengers,
});

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
export { calculatePrice };