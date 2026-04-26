"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.loginUser = exports.registerUser = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const errors_1 = require("../../utils/errors");
const jwt_1 = require("../../utils/jwt");
const prisma = new client_1.PrismaClient();
const registerUser = async (data) => {
    const existing = await prisma.user.findUnique({
        where: { phone: data.phone },
    });
    if (existing)
        throw new errors_1.AppError("Phone number already registered", 409);
    const hashed = await bcryptjs_1.default.hash(data.password, 12);
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
    const token = (0, jwt_1.signToken)({ userId: user.id, role: user.role });
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
exports.registerUser = registerUser;
const loginUser = async (data) => {
    const user = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (!user)
        throw new errors_1.AppError("Invalid phone or password", 401);
    const isMatch = await bcryptjs_1.default.compare(data.password, user.password);
    if (!isMatch)
        throw new errors_1.AppError("Invalid phone or password", 401);
    const token = (0, jwt_1.signToken)({ userId: user.id, role: user.role });
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
exports.loginUser = loginUser;
const getMe = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { driver: { include: { vehicle: true } } },
    });
    if (!user)
        throw new errors_1.AppError("User not found", 404);
    const { password: _password, ...safe } = user;
    return safe;
};
exports.getMe = getMe;
