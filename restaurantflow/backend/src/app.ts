import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { setupSwagger } from './config/swagger';
import { errorHandler } from './middleware/errorMiddleware';
import { apiRateLimiter } from './middleware/rateLimiter';
import { env } from './config/env';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI & Vite local dev scripts
      crossOriginEmbedderPolicy: false,
    })
  );

  // Enable reverse proxy support (Required for Render, Vercel, Cloudflare load balancers)
  app.set('trust proxy', 1);

  // CORS configuration: Allow all web clients in cloud & dev
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers (supports image document uploads)
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Global Rate Limiting
  app.use('/api/', apiRateLimiter);

  // Swagger Documentation mounted at /api/docs
  setupSwagger(app);

  // API Routes
  app.use('/api', routes);

  // Root welcome route
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'RestaurantFlow API',
      version: '1.0.0',
      description: 'Smart Restaurant Ordering & Management Platform API',
      documentation: '/api/docs',
      status: 'ONLINE',
    });
  });

  // 404 Route handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 'ROUTE_NOT_FOUND',
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
