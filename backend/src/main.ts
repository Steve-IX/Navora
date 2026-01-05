import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DatabaseInitService } from './config/database-init.service';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Initialize database (enable extensions, run migrations)
  // Only run in production or if explicitly enabled
  const runDbInit = configService.get('RUN_DB_INIT') === 'true' || 
                    configService.get('NODE_ENV') === 'production';
  
  if (runDbInit) {
    try {
      const dataSource = app.get(DataSource);
      const dbInitService = new DatabaseInitService(dataSource, configService);
      await dbInitService.initialize();
    } catch (error) {
      console.error('Database initialization error:', error);
      // In production, we might want to exit if DB init fails
      // For now, log and continue to allow app to start
      // The app will fail later if tables don't exist anyway
    }
  }

  // CORS - support multiple origins for production
  // IMPORTANT: Configure CORS BEFORE helmet to ensure preflight requests work
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:5173';
  const allowedOrigins = frontendUrl.split(',').map((url: string) => url.trim());
  
  console.log(`[CORS] Configuring CORS with allowed origins: ${allowedOrigins.join(', ')}`);
  
  // Enable CORS - use simple array for better compatibility with Railway
  app.enableCors({
    origin: allowedOrigins, // Simple array instead of function
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Cache preflight for 24 hours
  });

  // Security - configure helmet to work with CORS
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get('PORT') || 3000;
  // Listen on 0.0.0.0 for Railway/Docker compatibility
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on port ${port}`);
}
bootstrap();

