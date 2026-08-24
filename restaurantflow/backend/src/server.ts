import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { testConnection, closePool } from './config/database';
import { initSocketServer } from './websocket/socketServer';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.IO Real-Time Engine
  initSocketServer(httpServer);

  // Verify PostgreSQL Database Connection
  const isDbConnected = await testConnection();
  if (!isDbConnected) {
    logger.warn('⚠️ Warning: PostgreSQL database is not currently reachable. Please ensure PostgreSQL is running.');
  }

  // Start HTTP Server
  const PORT = env.PORT;
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info('====================================================');
    logger.info(`🚀 RestaurantFlow Backend Server running on port ${PORT}`);
    logger.info(`📡 Environment: ${env.NODE_ENV}`);
    logger.info(`📖 Swagger API Docs: http://localhost:${PORT}/api/docs`);
    logger.info(`🌐 Frontend Target: ${env.FRONTEND_URL}`);
    logger.info('====================================================');
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down RestaurantFlow server...`);
    httpServer.close(async () => {
      await closePool();
      logger.info('Closed all PostgreSQL database pool connections.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to bootstrap RestaurantFlow application');
  process.exit(1);
});
