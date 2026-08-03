/* Third-party modules */
import { zValidator } from '@/utils';
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import z from 'zod';

/* Custom modules */
import { db } from '@/db';
import { DBUser, UserTable } from '@/db/schemas';
import { env } from '@/env';
import authMiddleware from '@/middlewares/auth.middleware';

/* Utils */
import { handleRefreshToken, issueTokens } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { respondSuccess } from '@/utils';

/* Constants */
import { COOKIE_SECURE } from '@/constants';

/* Types */
import { AppException } from '@/types';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email').min(1, 'Email is required'),
  password: z
    .string('Invalid password')
    .min(8, 'Password must be at least 8 character long.'),
});

const loginSchema = z.object({
  email: z.email('Invalid email').min(1, 'Email is required'),
  password: z.string('Invalid password').min(1, 'Password is required.'),
});

export const authRouter = new Hono()
  .post('/register', zValidator('json', registerSchema), async (c) => {
    const { email, password, name } = c.req.valid('json');
    const userExists = await db.query.UserTable.findFirst({ where: { email } });

    if (userExists != null) {
      throw new AppException('CONFLICT', { message: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(UserTable)
      .values({ name, email, passwordHash })
      .returning({
        id: UserTable.id,
        name: UserTable.name,
        email: UserTable.email,
      });

    return respondSuccess<{
      user: Pick<DBUser, 'id' | 'name' | 'email'>;
    }>(c, {
      message: 'User created successfully.',
      data: { user },
      status: 201,
    });
  })
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const user = await db.query.UserTable.findFirst({ where: { email } });

    if (user == null) {
      throw new AppException('UNAUTHORIZED', {
        message: 'Invalid email or password.',
      });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppException('UNAUTHORIZED', {
        message: 'Invalid email or password.',
      });
    }

    const { accessToken, refreshToken } = await issueTokens({
      sub: user.id,
      email: email,
    });

    setCookie(c, env.ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      path: '/',
      maxAge: env.ACCESS_TOKEN_EXPIRATION_SECONDS,
    });

    setCookie(c, env.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      path: 'api/auth/refresh-token',
      maxAge: env.REFRESH_TOKEN_EXPIRATION_SECONDS,
    });

    return respondSuccess<{ user: Pick<DBUser, 'id' | 'name' | 'email'> }>(c, {
      message: 'User authenticated.',
      data: { user },
    });
  })
  .get('/me', authMiddleware, async (c) => {
    const { id, email } = c.get('user');

    const userRecord = await db.query.UserTable.findFirst({
      where: { id },
      columns: { name: true },
    });

    if (userRecord == null) {
      throw new AppException('USER_NOT_FOUND');
    }

    return respondSuccess<{ user: Pick<DBUser, 'id' | 'name' | 'email'> }>(c, {
      message: 'User authenticated.',
      data: { user: { id, name: userRecord.name, email } },
    });
  })
  .get('/refresh-token', authMiddleware, async (c) => {
    const { id, email } = c.get('user');
    const refreshToken = getCookie(c, env.REFRESH_TOKEN_COOKIE_NAME);

    if (refreshToken == null) {
      throw new AppException('MISSING_REFRESH_TOKEN');
    }

    // Clear the cookies
    deleteCookie(c, env.REFRESH_TOKEN_COOKIE_NAME);


    handleRefreshToken(refreshToken, id);
  });
