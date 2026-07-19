import { z } from 'zod';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  STORAGE_PATH: z.string().default('./storage'),
  MAX_FILE_SIZE: z.coerce.number().default(10737418240),
  CHUNK_SIZE: z.coerce.number().default(5242880),
  UPLOAD_DIR: z.string().default('./storage/uploads'),
  THUMBNAIL_DIR: z.string().default('./storage/thumbnails'),
  POSTER_DIR: z.string().default('./storage/posters'),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(900000),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  THUMBNAIL_COUNT: z.coerce.number().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
