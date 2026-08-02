/* Built-in modules */
import 'dotenv/config';

/* Third-party modules */
import z from 'zod';

const envSchema = z.object({
  // Config
  NODE_ENV: z
    .enum(['development', 'production', 'test'], {
      error: 'NODE_ENV must be one of: development, production, test',
    })
    .default('development'),
  PORT: z.coerce
    .number({ error: 'PORT must be a valid number' })
    .int('PORT must be an integer')
    .positive('PORT must be a positive number')
    .default(3000),

  // DB
  DB_PASSWORD: z
    .string('DB_PASSWORD is required')
    .min(1, 'DB_PASSWORD cannot be empty'),
  DB_USER: z.string('DB_USER is required').min(1, 'DB_USER cannot be empty'),
  DB_NAME: z.string('DB_NAME is required').min(1, 'DB_NAME cannot be empty'),
  DB_HOST: z.string('DB_HOST is required').min(1, 'DB_HOST cannot be empty'),
  DB_PORT: z.coerce
    .number({ error: 'DB_PORT must be a valid number' })
    .int('DB_PORT must be an integer')
    .positive('DB_PORT must be a positive number'),

  // Client
  CLIENT_URL: z.url('CLIENT_URL must be a valid URL'),

  // Tokens
  JWT_SECRET: z
    .string('JWT_SECRET is required')
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  ACCESS_TOKEN_EXPIRATION_SECONDS: z.coerce
    .number({ error: 'ACCESS_TOKEN_EXPIRATION_SECONDS must be a valid number' })
    .int('ACCESS_TOKEN_EXPIRATION_SECONDS must be an integer')
    .positive('ACCESS_TOKEN_EXPIRATION_SECONDS must be a positive number'),
  REFRESH_TOKEN_EXPIRATION_SECONDS: z.coerce
    .number({
      error: 'REFRESH_TOKEN_EXPIRATION_SECONDS must be a valid number',
    })
    .int('REFRESH_TOKEN_EXPIRATION_SECONDS must be an integer')
    .positive('REFRESH_TOKEN_EXPIRATION_SECONDS must be a positive number'),

  // Cookies
  REFRESH_TOKEN_COOKIE_NAME: z
    .string('REFRESH_TOKEN_COOKIE_NAME is required')
    .min(1, 'REFRESH_TOKEN_COOKIE_NAME cannot be empty'),
  ACCESS_TOKEN_COOKIE_NAME: z
    .string('ACCESS_TOKEN_COOKIE_NAME is required')
    .min(1, 'ACCESS_TOKEN_COOKIE_NAME cannot be empty'),
  COOKIE_SAME_SITE: z
    .enum(['strict', 'lax', 'none'], {
      error: 'COOKIE_SAME_SITE must be one of: strict, lax, none',
    })
    .default('lax'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid env: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;
