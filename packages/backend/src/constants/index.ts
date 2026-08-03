/* Third-party modules */
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/* Custom modules */
import { env } from '@/env';

export const COOKIE_SECURE = env.NODE_ENV === 'production';

export const ErrorMap = {
  // Generic 400
  BAD_REQUEST: { status: 400, message: 'The request is invalid' },
  VALIDATION_ERROR: { status: 400, message: 'One or more fields are invalid' },

  // Auth - 401
  UNAUTHORIZED: { status: 401, message: 'Authentication is required' },
  MISSING_ACCESS_TOKEN: {
    status: 401,
    message: 'Access token is missing from the request',
  },
  INVALID_ACCESS_TOKEN: {
    status: 401,
    message: 'The access token provided is invalid',
  },
  ACCESS_TOKEN_EXPIRED: {
    status: 401,
    message: 'The access token has expired',
  },
  REFRESH_TOKEN_EXPIRED: {
    status: 401,
    message: 'The refresh token has expired',
  },
  INVALID_REFRESH_TOKEN: {
    status: 401,
    message: 'The refresh token is invalid or has expired',
  },
  MISSING_REFRESH_TOKEN: {
    status: 401,
    message: 'Refresh token is missing from the request',
  },
  SESSION_EXPIRED: {
    status: 401,
    message: 'Your session has expired, please log in again',
  },
  INVALID_CREDENTIALS: {
    status: 401,
    message: 'Email or password is incorrect',
  },
  TOKEN_REVOKED: {
    status: 401,
    message: 'This token has been revoked',
  },

  // Auth - 403
  FORBIDDEN: {
    status: 403,
    message: 'You do not have permission to perform this action',
  },
  EMAIL_NOT_VERIFIED: {
    status: 403,
    message: 'Please verify your email address to continue',
  },
  ACCOUNT_DISABLED: {
    status: 403,
    message: 'This account has been disabled',
  },
  ACCOUNT_LOCKED: {
    status: 403,
    message: 'This account has been locked due to too many failed attempts',
  },
  INSUFFICIENT_SCOPE: {
    status: 403,
    message: 'The token does not have the required scope for this action',
  },

  // Resource - 404 / 409
  NOT_FOUND: { status: 404, message: 'The requested resource was not found' },
  USER_NOT_FOUND: { status: 404, message: 'User not found' },
  CONFLICT: { status: 409, message: 'The resource already exists' },
  EMAIL_ALREADY_EXISTS: {
    status: 409,
    message: 'An account with this email already exists',
  },

  // Rate limiting
  TOO_MANY_REQUESTS: {
    status: 429,
    message: 'Too many requests, please try again later',
  },
  TOO_MANY_LOGIN_ATTEMPTS: {
    status: 429,
    message: 'Too many login attempts, please try again later',
  },

  // Server
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: 'An internal server error occurred',
  },
} as const satisfies Record<
  string,
  { status: ContentfulStatusCode; message: string }
>;

export type ErrorKey = keyof typeof ErrorMap;
