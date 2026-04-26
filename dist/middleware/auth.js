"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictTo = exports.protect = void 0;
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return (0, response_1.sendError)(res, "Not authorized. No token provided.", 401);
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch {
        return (0, response_1.sendError)(res, "Not authorized. Invalid token.", 401);
    }
};
exports.protect = protect;
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return (0, response_1.sendError)(res, "You do not have permission to do this.", 403);
        }
        next();
    };
};
exports.restrictTo = restrictTo;
