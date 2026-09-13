import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'rf-access-token'],
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

  // Static directory for APK Downloads
  const publicDir = path.join(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // Direct APK download route for Android mobile phones
  app.get('/RestaurantFlow.apk', (req: Request, res: Response) => {
    const apkPath = path.join(__dirname, '../public/RestaurantFlow.apk');
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="RestaurantFlow.apk"');
      res.download(apkPath, 'RestaurantFlow.apk');
    } else {
      res.status(404).send('APK compilation in progress. Please check back in a moment.');
    }
  });

  app.get('/download/RestaurantFlow.apk', (req: Request, res: Response) => {
    const apkPath = path.join(__dirname, '../public/RestaurantFlow.apk');
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="RestaurantFlow.apk"');
      res.download(apkPath, 'RestaurantFlow.apk');
    } else {
      res.status(404).send('APK compilation in progress. Please check back in a moment.');
    }
  });

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
