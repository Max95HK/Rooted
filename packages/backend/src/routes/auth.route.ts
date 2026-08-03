/* Built-in modules */
import { createHash } from 'node:crypto';

/* Third-party modules */
import { zValidator } from '@/utils';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, getCookie } from 'hono/cookie';
import z from 'zod';

/* Custom modules */
import { db } from '@/db';
import { DBUser, RefreshTokenTable, UserTable } from '@/db/schemas';
import { env } from '@/env';
import authMiddleware from '@/middlewares/auth.middleware';

/* Utils */
import {
  handleRefreshToken,
  issueTokens,
  setRefreshTokenCookie,
} from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { respondSuccess } from '@/utils';

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

// TODO: al posto di /me /users/current
// TODO: rimuovere email dal payload dell'accessToken

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
    const user = await db.query.UserTable.findFirst({
      where: { email },
      columns: { id: true, name: true, email: true, passwordHash: true },
    });

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
      subject: user.id,
    });

    setRefreshTokenCookie(c, refreshToken);

    return respondSuccess<{
      user: Pick<DBUser, 'id' | 'name' | 'email'>;
      accessToken: string;
    }>(c, {
      message: 'User authenticated.',
      data: {
        user: { id: user.id, name: user.name, email: user.email },
        accessToken,
      },
    });
  })
  .get('/users/current', authMiddleware, async (c) => {
    const { id } = c.get('user');

    const userRecord = await db.query.UserTable.findFirst({
      where: { id },
      columns: { name: true, email: true },
    });

    if (userRecord == null) {
      throw new AppException('USER_NOT_FOUND');
    }

    return respondSuccess<{ user: Pick<DBUser, 'id' | 'name' | 'email'> }>(c, {
      message: 'User authenticated.',
      data: { user: { id, name: userRecord.name, email: userRecord.email } },
    });
  })
  .post('/refresh-token', async (c) => {
    const refreshToken = getCookie(c, env.REFRESH_TOKEN_COOKIE_NAME);

    if (refreshToken == null) {
      throw new AppException('MISSING_REFRESH_TOKEN');
    }

    return await handleRefreshToken(c, refreshToken);
  })
  .post('/logout', async (c) => {
    const refreshToken = getCookie(c, env.REFRESH_TOKEN_COOKIE_NAME);

    if (refreshToken == null) {
      return respondSuccess(c, { message: 'User logged out successfully.' });
    }

    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const refreshTokensMatch = await db.query.RefreshTokenTable.findFirst({
      where: { refreshTokenHash },
    });

    if (refreshTokensMatch == null) {
      return respondSuccess(c, { message: 'User logged out successfully.' });
    }

    const today = new Date();

    await db
      .update(RefreshTokenTable)
      .set({ revokedAt: today })
      .where(eq(RefreshTokenTable.id, refreshTokensMatch.id));

    deleteCookie(c, env.REFRESH_TOKEN_COOKIE_NAME);

    // TODO: implementare il logout da tutti i dispositivi

    return respondSuccess(c, { message: 'User logged out successfully.' });
  });
