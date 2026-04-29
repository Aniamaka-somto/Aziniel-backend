import { Server } from "socket.io";
import http from "http";
import { prisma } from "./lib/prisma"


const socketToDriver = new Map<string, string>();
let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Driver goes online — joins their own room
    // Update driver:online handler:
    socket.on("driver:online", (driverId: string) => {
      socket.join(`driver:${driverId}`);
      socketToDriver.set(socket.id, driverId);
      console.log(`Driver ${driverId} is online`);
      console.log(`Driver ${driverId} joined room driver:${driverId}`); // ← add
      console.log("All rooms this socket is in:", Array.from(socket.rooms));
    });

    // User joins their own room to receive updates
    socket.on("user:join", (userId: string) => {
      socket.join(`user:${userId}`);
    });

    // Driver sends location update
    socket.on(
      "driver:location",
      (data: {
        driverId: string;
        latitude: number;
        longitude: number;
        bookingId?: string;
      }) => {
        // Broadcast to the user on this booking
        if (data.bookingId) {
          io.to(`booking:${data.bookingId}`).emit("driver:location", {
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      },
    );

    // Driver accepts a ride
    socket.on(
      "ride:accept",
      (data: { bookingId: string; driverId: string }) => {
        io.to(`booking:${data.bookingId}`).emit("ride:accepted", {
          bookingId: data.bookingId,
          driverId: data.driverId,
        });
      },
    );

    // Join a booking room (both driver and user join this)
    socket.on("booking:join", (bookingId: string) => {
      socket.join(`booking:${bookingId}`);
    });

    // Ride cancelled
    socket.on("ride:cancel", (data: { bookingId: string }) => {
      io.to(`booking:${data.bookingId}`).emit("ride:cancelled", {
        bookingId: data.bookingId,
      });
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const driverId = socketToDriver.get(socket.id);
      if (driverId) {
        try {
          await prisma.driver.update({
            where: { id: driverId },
            data: { status: "OFFLINE" },
          });
          console.log(`Driver ${driverId} set OFFLINE on disconnect`);
        } catch (err) {
          console.warn("Could not set driver offline:", err);
        }
        socketToDriver.delete(socket.id);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};
