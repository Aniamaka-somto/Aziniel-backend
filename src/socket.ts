import { Server } from "socket.io";
import http from "http";

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
      console.log(`Driver ${driverId} is online`);
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

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};
