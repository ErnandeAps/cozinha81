import { DocumentBuilder } from '@nestjs/swagger';

export const openApiConfig = new DocumentBuilder()
  .setTitle('Cozinha81 API')
  .setDescription('Cozinha81 monorepo API spec')
  .setVersion('1.0')
  .build();
