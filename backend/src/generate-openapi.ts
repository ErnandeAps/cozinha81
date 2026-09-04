import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { openApiConfig } from './core/openapi.config';
import * as fs from 'fs';
import * as path from 'path';

async function generate() {
  let app;
  try {
    app = await NestFactory.create(AppModule, { logger: false });
    
    // Set the same global prefix configuration
    app.setGlobalPrefix('api', {
      exclude: ['health', 'error-test'],
    });

    const document = SwaggerModule.createDocument(app, openApiConfig);
    
    const outputPath = path.resolve(__dirname, '../openapi-spec.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    console.log(`OpenAPI schema successfully written to ${outputPath}`);
  } catch (error) {
    console.error('Error generating OpenAPI spec:', error);
    process.exit(1);
  } finally {
    if (app) {
      await app.close();
    }
  }
}

generate().catch((error) => {
  console.error('Unhandled error in generation:', error);
  process.exit(1);
});
