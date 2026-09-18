import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { createLoggerConfig } from './common/logger/logger.config';
import { DataSource } from 'typeorm';
import { InitialSeeding1785451531000 } from './migrations/initial_seeding.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createLoggerConfig(),
  }); // Use the dynamic logger configuration
  // Retrieve ConfigService instance
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const environment = configService.get<string>('NODE_ENV') || 'production';

  if (environment === 'development') {
    const logger = new Logger('SeedingInit');

    try {
      const dataSource = app.get(DataSource);
      const queryRunner = dataSource.createQueryRunner();

      await queryRunner.connect();
      logger.log('🚀 Running database seeding...');

      const seeder = new InitialSeeding1785451531000();
      await seeder.up(queryRunner);

      await queryRunner.release();
      logger.log('✅ Database seeding completed successfully!');
    } catch (error) {
      logger.error('❌ Database seeding failed: ' + (error.message || error));
      if (error.query) {
        logger.error('Failed Query: ' + error.query);
      }
      process.exitCode = 1;
    }
  }
  app.enableCors({
    origin: '*',
  });
  // 1. SECURE HTTP HEADERS (Helmet)
  app.use(helmet());

  // 2. TRUST PROXY (Critical for deployment!)
  // If your server sits behind a reverse proxy (like Nginx, Heroku, AWS ALB, digitalOcean)
  // this ensures the rate limiter reads the client's actual IP, not the proxy's server IP.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const expressApp = app.getHttpAdapter().getInstance();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  expressApp.set('trust proxy', 1);

  app.setGlobalPrefix('api/v1');

  // Enable global validation and automatic type transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away properties that don't belong in the DTO
      transform: true, // Auto-transforms strings to numbers/booleans based on DTO types
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Bind ClassSerializerInterceptor globally to apply @Exclude()
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(port);
}

bootstrap().catch(console.error);
