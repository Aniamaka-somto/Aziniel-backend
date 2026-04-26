"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        // Driver goes online — joins their own room
        // Update driver:online handler:
        socket.on("driver:online", (driverId) => {
            socket.join(`driver:${driverId}`);
            console.log(`Driver ${driverId} is online`);
        });
        // User joins their own room to receive updates
        socket.on("user:join", (userId) => {
            socket.join(`user:${userId}`);
        });
        // Driver sends location update
        socket.on("driver:location", (data) => {
            // Broadcast to the user on this booking
            if (data.bookingId) {
                io.to(`booking:${data.bookingId}`).emit("driver:location", {
                    latitude: data.latitude,
                    longitude: data.longitude,
                });
            }
        });
        // Driver accepts a ride
        socket.on("ride:accept", (data) => {
            io.to(`booking:${data.bookingId}`).emit("ride:accepted", {
                bookingId: data.bookingId,
                driverId: data.driverId,
            });
        });
        // Join a booking room (both driver and user join this)
        socket.on("booking:join", (bookingId) => {
            socket.join(`booking:${bookingId}`);
        });
        // Ride cancelled
        socket.on("ride:cancel", (data) => {
            io.to(`booking:${data.bookingId}`).emit("ride:cancelled", {
                bookingId: data.bookingId,
            });
        });
        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io)
        throw new Error("Socket not initialized");
    return io;
};
exports.getIO = getIO;
