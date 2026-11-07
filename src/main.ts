import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { ValidationException } from './common/exceptions/validation.exception';
import { useContainer } from 'class-validator';
import { QueueDashboardModule } from './queue/queue-dashboard.module';
import { BasicAuthMiddleware } from './queue/basic-auth.middleware';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interfaces/response.interceptor';

async function bootstrap() {
  const logger = console;
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/static/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown properties
      transform: true, // auto-transform payloads to DTO instances
      forbidNonWhitelisted: false, // optional: throw if unknown properties are sent
      exceptionFactory: (errors) => {
        const formatted: Record<string, string[]> = {};
        errors.forEach((err) => {
          if (err.constraints) {
            formatted[err.property] = Object.values(err.constraints);
          }
        });
        return new ValidationException(formatted);
      },
    }),
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  //

  const queueDashboard = app.get(QueueDashboardModule);
  const basicAuth = app.get(BasicAuthMiddleware);
  queueDashboard.setupDashboard(app, basicAuth);

  app.enableCors({
    origin: '*', // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*', // Allow all headers
    credentials: false, // Set to true only if cookies/auth are needed
    exposedHeaders: ['Location', 'Upload-Offset', 'Upload-Length', 'Upload-Id'],
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Chekbit Stellar API')
    .setDescription('API documentation for the Chekbit Stellar payment service infrastructure')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token', // 👈 name (important)
    )
    .build();

  //disable swagger in production
  if (process.env.APP_ENV === 'production') {
    logger.warn('Swagger documentation is disabled in production');
  } else {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document); // URL: /api/docs
  }

  const appEnv = String(process.env.APP_ENV ?? '').toLowerCase();
  const defaultPort = appEnv === 'sandbox' ? 5001 : 5000;
  const port = Number(process.env.PORT ?? defaultPort);

  await app.listen(Number.isNaN(port) ? defaultPort : port);
}
bootstrap();
