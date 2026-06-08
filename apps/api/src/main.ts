import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; // Прилагоди ја патеката до твојот модул
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    // Имплементираме точни типови за origin (string) и callback функцијата
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    exposedHeaders: '*',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());

  // Твоите body-parser нагодувања за големи фајлови (ќе ни требаат и за дигиталните потписи/PDF подоцна)
  app.use(bodyParser.json({ limit: '30mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '30mb' }));

  // Портата за Render (Render ја дава преку процес, ако ја нема стави ја твојата)
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
