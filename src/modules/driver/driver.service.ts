import { PrismaClient, DriverStatus, VehicleClass } from "@prisma/client";
import { AppError } from "../../utils/errors";

import { prisma } from "../../lib/prisma";

export const getDriverProfile = async (userId: string) => {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: { user: true, vehicle: true },
  });
  if (!driver) throw new AppError("Driver profile not found", 404);
  return driver;
};

export const updateDriverStatus = async (
  userId: string,
  status: DriverStatus,
) => {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new AppError("Driver profile not found", 404);

  return prisma.driver.update({
    where: { userId },
    data: { status },
  });
};

export const updateDriverLocation = async (
  userId: string,
  lat: number,
  lng: number,
) => {
  return prisma.driver.update({
    where: { userId },
    data: { currentLat: lat, currentLng: lng },
  });
};

export const uploadDriverDocs = async (
  userId: string,
  licenseDoc?: string,
  vehicleDoc?: string,
  licenseNumber?: string,
) => {
  return prisma.driver.update({
    where: { userId },
    data: {
      ...(licenseDoc && { licenseDoc }),
      ...(vehicleDoc && { vehicleDoc }),
      ...(licenseNumber && { licenseNumber }),
    },
  });
};

export const addOrUpdateVehicle = async (
  userId: string,
  data: {
    make: string;
    model: string;
    year: number;
    plateNumber: string;
    color: string;
    class: VehicleClass;
  },
) => {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new AppError("Driver profile not found", 404);

  return prisma.vehicle.upsert({
    where: { driverId: driver.id },
    update: data,
    create: { ...data, driverId: driver.id },
  });
};

export const getDriverEarnings = async (userId: string) => {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: {
      earnings: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!driver) throw new AppError("Driver profile not found", 404);

  return {
    totalEarnings: driver.totalEarnings,
    earnings: driver.earnings,
  };
};

export const getDriverBookings = async (userId: string) => {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new AppError("Driver profile not found", 404);

  return prisma.booking.findMany({
    where: { driverId: driver.id },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
};
export const getNearbyDrivers = async (
  lat: number,
  lng: number,
  radiusKm = 5,
) => {
  const drivers = await prisma.driver.findMany({
    where: {
      status: "ONLINE",
      currentLat: { not: null },
      currentLng: { not: null },
    },
    include: {
      vehicle: true,
      user: { select: { fullName: true, avatar: true } },
    },
  });

  const nearby = drivers.filter((driver) => {
    if (!driver.currentLat || !driver.currentLng) return false;
    return (
      getDistanceKm(lat, lng, driver.currentLat, driver.currentLng) <= radiusKm
    );
  });

  return nearby.map((d) => ({
    id: d.id,
    latitude: d.currentLat!,
    longitude: d.currentLng!,
    vehicleClass: d.vehicle?.class ?? "SEDAN",
    fullName: d.user.fullName,
    rating: d.rating,
  }));
};

const getDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
