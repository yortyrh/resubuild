import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  // snapshot required by @nestjs/devtools-integration (see apps/api/README.md "Debugging the API");
  // bodyParser is registered by configureApp() after the Better Auth handler.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    snapshot: true,
    bodyParser: false,
  });

  configureApp(app);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
