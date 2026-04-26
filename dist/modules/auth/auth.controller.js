"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePushToken = exports.me = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const auth_service_1 = require("./auth.service");
const response_1 = require("../../utils/response");
const prisma = new client_1.PrismaClient();
const register = async (req, res) => {
    const result = await (0, auth_service_1.registerUser)(req.body);
    (0, response_1.sendSuccess)(res, result, "Registration successful", 201);
};
exports.register = register;
const login = async (req, res) => {
    const result = await (0, auth_service_1.loginUser)(req.body);
    (0, response_1.sendSuccess)(res, result, "Login successful");
};
exports.login = login;
const me = async (req, res) => {
    const user = await (0, auth_service_1.getMe)(req.user.userId);
    (0, response_1.sendSuccess)(res, user, "User fetched");
};
exports.me = me;
const savePushToken = async (req, res) => {
    const { pushToken } = req.body;
    await prisma.user.update({
        where: { id: req.user.userId },
        data: { pushToken },
    });
    (0, response_1.sendSuccess)(res, null, "Push token saved");
};
exports.savePushToken = savePushToken;
