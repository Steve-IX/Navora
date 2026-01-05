import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DatabaseInitService {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing database...');

      // Step 1: Enable required extensions
      await this.enableExtensions();

      // Step 2: Run migrations
      await this.runMigrations();

      this.logger.log('Database initialization completed successfully');
    } catch (error) {
      this.logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async enableExtensions(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      // Enable uuid-ossp extension (required for uuid_generate_v4())
      this.logger.log('Enabling uuid-ossp extension...');
      try {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        this.logger.log('uuid-ossp extension enabled');
      } catch (error: any) {
        this.logger.warn(`Failed to enable uuid-ossp extension: ${error.message}`);
      }

      // Try to enable PostGIS extension
      this.logger.log('Attempting to enable PostGIS extension...');
      try {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "postgis"');
        this.logger.log('PostGIS extension enabled successfully');
      } catch (error: any) {
        // PostGIS might not be available (e.g., on Railway's standard PostgreSQL)
        this.logger.warn(
          `PostGIS extension is not available: ${error.message}. ` +
          `This is expected on Railway's standard PostgreSQL. ` +
          `Consider using a PostGIS-enabled PostgreSQL template.`,
        );
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async runMigrations(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      // Read migration file - try multiple paths
      // In production, migrations folder should be at backend/migrations/ (source location)
      // process.cwd() should be /app/backend when running from backend directory
      const possiblePaths = [
        join(process.cwd(), 'migrations', '001_add_social_features_tables.sql'), // From backend root
        join(__dirname, '../../../../migrations/001_add_social_features_tables.sql'), // Relative from dist/backend/src/config
        join(__dirname, '../../../migrations/001_add_social_features_tables.sql'), // Fallback
      ];

      let migrationPath: string | null = null;
      let migrationSQL: string | null = null;

      for (const path of possiblePaths) {
        try {
          this.logger.log(`Trying migration path: ${path}`);
          migrationSQL = readFileSync(path, 'utf-8');
          migrationPath = path;
          this.logger.log(`Successfully found migration file at: ${migrationPath}`);
          break;
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      if (!migrationSQL) {
        throw new Error('Migration file not found in any expected location');
      }

      // Split by semicolons and execute each statement
      // Filter out empty statements and comments
      const statements = migrationSQL
        .split(';')
        .map((s) => s.trim())
        .filter(
          (s) =>
            s.length > 0 &&
            !s.startsWith('--') &&
            !s.startsWith('/*') &&
            s !== '\n',
        );

      this.logger.log(`Executing ${statements.length} migration statements...`);

      for (const statement of statements) {
        if (statement.trim().length > 0) {
          try {
            await queryRunner.query(statement);
          } catch (error: any) {
            // Some statements might fail if they already exist (CREATE TABLE IF NOT EXISTS, etc.)
            // But we should log errors that aren't about existing objects
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('duplicate') &&
              !error.message.includes('relation already exists')
            ) {
              this.logger.warn(
                `Migration statement warning: ${error.message}`,
              );
            }
          }
        }
      }

      this.logger.log('Migration statements executed');
    } catch (error: any) {
      // If file doesn't exist, log warning but don't fail
      if (error.code === 'ENOENT') {
        this.logger.warn(
          'Migration file not found. Skipping manual migrations. ' +
          'Ensure TypeORM synchronize is enabled or migrations are run manually.',
        );
      } else {
        throw error;
      }
    } finally {
      await queryRunner.release();
    }
  }
}

