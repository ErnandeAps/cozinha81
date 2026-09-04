import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { GlobalExceptionFilter } from './core/filters/http-exception.filter';
import { SwaggerModule } from '@nestjs/swagger';
import { openApiConfig } from './core/openapi.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS para os frontends (portal/kds/backoffice). Aceita localhost e domínios
  // públicos do ngrok usados em testes fora do PC.
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:4200',
        'http://localhost:4201',
        'http://localhost:3000',
        'http://127.0.0.1:4200',
        'http://127.0.0.1:3000',
      ];

      const isAllowedOrigin =
        !origin ||
        allowed.includes(origin) ||
        /\.ngrok-free\.app$/i.test(origin) ||
        /\.ngrok\.app$/i.test(origin) ||
        /\.ngrok-free\.app:\d+$/i.test(origin) ||
        /\.ngrok\.app:\d+$/i.test(origin);

      if (isAllowedOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: ['health', 'error-test'],
  });
  app.useGlobalFilters(new GlobalExceptionFilter());

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document);

  const rawPort = process.env.PORT || '3000';
  let port = parseInt(rawPort, 10);
  if (isNaN(port)) {
    Logger.warn(`Invalid PORT environment variable "${rawPort}". Defaulting to 3000.`);
    port = 3000;
  }
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap().catch((error) => {
  Logger.error('Application failed to start:', error);
  process.exit(1);
});
