import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AppError } from "../../utils/errors";
import { signToken } from "../../utils/jwt";

import { prisma } from "../../lib/prisma";

export const registerUser = async (data: {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  role?: "USER" | "DRIVER";
}) => {
  const existing = await prisma.user.findUnique({
    where: { phone: data.phone },
  });
  if (existing) throw new AppError("Phone number already registered", 409);

  const hashed = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      password: hashed,
      role: data.role || "USER",
    },
  });

  if (user.role === "DRIVER") {
    await prisma.driver.create({ data: { userId: user.id } });
  }

  const token = signToken({ userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      rating: user.rating,
    },
  };
};

export const loginUser = async (data: { phone: string; password: string }) => {
  const user = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (!user) throw new AppError("Invalid phone or password", 401);

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) throw new AppError("Invalid phone or password", 401);

  const token = signToken({ userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      rating: user.rating,
    },
  };
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driver: { include: { vehicle: true } } },
  });
  if (!user) throw new AppError("User not found", 404);
  const { password: _password, ...safe } = user;
  return safe;
};
