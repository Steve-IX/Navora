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

  // Security
  app.use(helmet());

  // CORS - support multiple origins for production
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:5173';
  const allowedOrigins = frontendUrl.split(',').map((url: string) => url.trim());
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some((allowed: string) => origin.startsWith(allowed) || allowed === '*')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

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

