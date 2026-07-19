import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { config } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { registerAuthRoutes } from './routes/auth';
import { registerVideoRoutes } from './routes/videos';
import { registerUploadRoutes } from './routes/uploads';
import { registerAdminRoutes } from './routes/admin';
import { registerSettingsRoutes } from './routes/settings';
import { registerStatsRoutes } from './routes/stats';
import { registerSwagger } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';
import fs from 'fs';

const server = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  trustProxy: true,
  bodyLimit: config.MAX_FILE_SIZE,
});

async function bootstrap() {
  await server.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  await server.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE,
      files: 10,
    },
  });

  await server.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', '::1'],
  });

  await server.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  });

  const dirs = [
    config.UPLOAD_DIR,
    config.THUMBNAIL_DIR,
    config.POSTER_DIR,
    path.join(config.STORAGE_PATH, 'chunks'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  await server.register(fastifyStatic, {
    root: path.resolve(config.STORAGE_PATH),
    prefix: '/storage/',
    decorateReply: false,
  });

  await registerSwagger(server);

  server.setErrorHandler(errorHandler);

  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  await registerAuthRoutes(server);
  await registerVideoRoutes(server);
  await registerUploadRoutes(server);
  await registerAdminRoutes(server);
  await registerSettingsRoutes(server);
  await registerStatsRoutes(server);

  try {
    await server.listen({ port: config.PORT, host: config.HOST });
    server.log.info(`🚀 NovaStream server running on http://${config.HOST}:${config.PORT}`);
    server.log.info(`📚 Swagger docs at http://${config.HOST}:${config.PORT}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  if (redis) redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  if (redis) redis.disconnect();
  process.exit(0);
});

bootstrap();
