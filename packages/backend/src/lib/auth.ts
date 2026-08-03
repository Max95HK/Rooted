/* Built-in modules */
import { createHash, randomBytes } from 'node:crypto';

/* Third-party modules */
import { and, eq, isNull } from 'drizzle-orm';
import { sign } from 'hono/jwt';

/* Custom modules */
import { db } from '@/db';
import { RefreshTokenTable } from '@/db/schemas/refreshToken';
import { env } from '@/env';

/* Types */
import { COOKIE_SECURE } from '@/constants';
import { AppException, type AccessTokenPayload } from '@/types';
import { respondSuccess } from '@/utils';
import { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { JWTPayload } from 'hono/utils/jwt/types';

export const generateAccessToken = async (payload: JWTPayload) => {
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await sign(
    { ...payload, exp: now + env.ACCESS_TOKEN_EXPIRATION_SECONDS, iat: now },
    env.JWT_SECRET,
    'HS256',
  );

  return { accessToken };
};

export const generateRefreshToken = () => {
  const refreshToken = randomBytes(32).toString('base64url');
  const refreshTokenHash = createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  return { refreshToken, refreshTokenHash };
};

export const issueTokens = async (payload: AccessTokenPayload) => {
  const { accessToken } = await generateAccessToken({
    subject: payload.subject,
  });

  const { refreshToken, refreshTokenHash } = generateRefreshToken();

  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
  );

  await db
    .insert(RefreshTokenTable)
    .values({ userId: payload.subject, refreshTokenHash, expiresAt });

  return { accessToken, refreshToken };
};

export const handleRefreshToken = async (c: Context, refreshToken: string) => {
  try {
    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const refreshTokensMatch = await db.query.RefreshTokenTable.findFirst({
      where: { refreshTokenHash },
    });

    if (refreshTokensMatch == null) {
      throw new AppException('INVALID_REFRESH_TOKEN');
    }

    const today = new Date();

    if (refreshTokensMatch.revokedAt != null) {
      await db
        .update(RefreshTokenTable)
        .set({ revokedAt: today })
        .where(
          and(
            eq(RefreshTokenTable.userId, refreshTokensMatch.userId),
            isNull(RefreshTokenTable.revokedAt),
          ),
        );

      throw new AppException('INVALID_REFRESH_TOKEN');
    }

    if (refreshTokensMatch.expiresAt < today) {
      throw new AppException('REFRESH_TOKEN_EXPIRED');
    }

    const user = await db.query.UserTable.findFirst({
      where: { id: refreshTokensMatch.userId },
      columns: {
        id: true,
        email: true,
      },
    });

    if (user == null) {
      throw new AppException('USER_NOT_FOUND');
    }
    const { accessToken: newAccessToken } = await generateAccessToken({
      sub: user.id,
      email: user.email,
    });

    const {
      refreshToken: newRefreshToken,
      refreshTokenHash: newRefreshTokenHash,
    } = generateRefreshToken();

    await db.transaction(async (tx) => {
      const [{ id: refreshTokenId }] = await tx
        .insert(RefreshTokenTable)
        .values({
          refreshTokenHash: newRefreshTokenHash,
          userId: user.id,
          expiresAt: new Date(
            today.getTime() + env.REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
          ),
        })
        .returning({ id: RefreshTokenTable.id });

      await tx
        .update(RefreshTokenTable)
        .set({ revokedAt: today, replacedByTokenId: refreshTokenId })
        .where(eq(RefreshTokenTable.id, refreshTokensMatch.id));
    });

    // TODO: Handle concurrent refresh‑token race condition

    setRefreshTokenCookie(c, newRefreshToken);

    return respondSuccess<{ accessToken: string }>(c, {
      message: 'Refresh token updated successfully.',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    // Clear the cookies
    deleteCookie(c, env.REFRESH_TOKEN_COOKIE_NAME);
    throw error;
  }
};

export const setRefreshTokenCookie = (c: Context, refreshToken: string) => {
  setCookie(c, env.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/api/auth/refresh-token',
    maxAge: env.REFRESH_TOKEN_EXPIRATION_SECONDS,
  });
};
