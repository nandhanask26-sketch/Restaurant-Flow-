import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from './socketEvents';
import { verifyAccessToken } from '../utils/tokenGenerator';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        (socket as any).user = payload;
      } catch {
        // Allow unauthenticated connection for public status watching
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, '🔌 Socket client connected');

    // Join specific restaurant room (for managers and watching customers)
    socket.on(SOCKET_EVENTS.JOIN_RESTAURANT, (restaurantId: string) => {
      socket.join(`restaurant:${restaurantId}`);
      logger.debug({ socketId: socket.id, restaurantId }, 'Joined restaurant room');
    });

    socket.on(SOCKET_EVENTS.LEAVE_RESTAURANT, (restaurantId: string) => {
      socket.leave(`restaurant:${restaurantId}`);
      logger.debug({ socketId: socket.id, restaurantId }, 'Left restaurant room');
    });

    // Join user-specific room (for order tracking)
    socket.on(SOCKET_EVENTS.JOIN_USER, (userId: string) => {
      socket.join(`user:${userId}`);
      logger.debug({ socketId: socket.id, userId }, 'Joined user room');
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, '🔌 Socket client disconnected');
    });
  });

  return io;
}

export function getSocketIO(): Server | null {
  return io;
}

export function emitToRestaurant(restaurantId: string, event: string, data: any): void {
  if (io) {
    io.to(`restaurant:${restaurantId}`).emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: any): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitGlobal(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
  }
}
