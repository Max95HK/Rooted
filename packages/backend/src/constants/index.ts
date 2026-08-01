import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const ErrorMap = {
  BAD_REQUEST: { status: 400, message: 'The request is invalid' },
  VALIDATION_ERROR: { status: 400, message: 'One or more fields are invalid' },
  UNAUTHORIZED: { status: 401, message: 'Authentication is required' },
  FORBIDDEN: {
    status: 403,
    message: 'You do not have permission to perform this action',
  },
  NOT_FOUND: { status: 404, message: 'The requested resource was not found' },
  CONFLICT: { status: 409, message: 'The resource already exists' },
  TOO_MANY_REQUESTS: {
    status: 429,
    message: 'Too many requests, please try again later',
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: 'An internal server error occurred',
  },
} as const satisfies Record<
  string,
  { status: ContentfulStatusCode; message: string }
>;

export type ErrorKey = keyof typeof ErrorMap;

export const JWT_EXPIRATION_SECONDS = 5 * 60;
