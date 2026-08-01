/* Third-party modules */
import { Hono } from 'hono';

/* Types */
import { AppException, ErrorResponse } from '@/types';

const app = new Hono();

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

export default app;
