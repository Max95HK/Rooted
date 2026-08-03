/* Third-party modules */
import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';

/* Custom modules */
import { env } from '@/env';
import { accessTokenPayloadSchema } from '@/types';

/* Types */
import { AppException, type HonoEnv } from '@/types';
import { JwtTokenExpired, JwtTokenInvalid } from 'hono/utils/jwt/types';
import { ZodError } from 'zod';

const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppException('MISSING_ACCESS_TOKEN');
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();

  try {
    const decodedPayload = await verify(accessToken, env.JWT_SECRET, 'HS256');
    const payload = accessTokenPayloadSchema.parse(decodedPayload);

    c.set('user', { id: payload.sub, email: payload.email });
  } catch (error) {
    if (error instanceof JwtTokenExpired) {
      throw new AppException('ACCESS_TOKEN_EXPIRED');
    }

    if (error instanceof JwtTokenInvalid || error instanceof ZodError) {
      throw new AppException('INVALID_ACCESS_TOKEN');
    }

    console.error('Unexpected error in authMiddleware:', error);
    throw new AppException('UNAUTHORIZED');
  }

  await next();
});

export default authMiddleware;
