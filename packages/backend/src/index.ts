/* Third-party modules */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

/* Custom modules */
import { authRouter } from '@/routes/auth.route';
import { apiKeysRouter } from '@/routes/apiKeys.route';
import { env } from '@/env';

/* Types */
import { AppException, ErrorResponse, HonoEnv } from '@/types';

const app = new Hono<HonoEnv>();

app.use(logger());

app.use(
  '*',
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: [],
    maxAge: 600,
  }),
);

const router = app.basePath('/api').route('/auth', authRouter)

app.onError((err, c) => {
  if (err instanceof AppException) {
    const body: ErrorResponse = {
      success: false,
      error: err.errorKey,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    };
    return c.json(body, err.status);
  }

  console.error(err);

  const body: ErrorResponse = {
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An internal server error occurred',
  };
  return c.json(body, 500);
});

app.notFound((c) => {
  const body: ErrorResponse = {
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested resource was not found',
  };
  return c.json(body, 404);
});

export type AppType = typeof router;
export default app;
