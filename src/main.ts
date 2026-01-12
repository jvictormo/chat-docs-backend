import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Always allow localhost for local development
  const defaultOrigins = ["http://loaacalhost:3000"];

  // Additional allowed origins from environment variable
  const envOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : [];

  const allowedOrigins = [...defaultOrigins, ...envOrigins];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser tools (Postman, curl)
      if (!origin) return callback(null, true);

      if (origin.includes('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`),
        false
      );
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle("ChatDocs API")
    .setDescription("API do ChatDocs")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
