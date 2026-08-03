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
import { UserTable } from '@/db/schemas';
import { AppException, type AccessTokenPayload } from '@/types';
import { JWTPayload } from 'hono/utils/jwt/types';
import { respondSuccess } from '@/utils';
import { Context } from 'hono';

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
    sub: payload.sub,
    email: payload.email,
  });

  const { refreshToken, refreshTokenHash } = generateRefreshToken();

  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
  );

  await db
    .insert(RefreshTokenTable)
    .values({ userId: payload.sub, refreshTokenHash, expiresAt });

  return { accessToken, refreshToken, refreshTokenHash };
};

export const handleRefreshToken = async (
  c: Context,
  refreshToken: string,
  userId: string,
) => {
  const refreshTokenHash = createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  const refreshTokensMatch = await db.query.RefreshTokenTable.findFirst({
    where: { refreshTokenHash, userId },
  });

  if (refreshTokensMatch == null) {
    throw new AppException('INVALID_REFRESH_TOKEN');
  }

  if (refreshTokensMatch.revokedAt != null) {
    await db
      .delete(RefreshTokenTable)
      .where(
        and(
          eq(RefreshTokenTable.userId, refreshTokensMatch.userId),
          isNull(RefreshTokenTable.revokedAt),
        ),
      );

    throw new AppException('INVALID_REFRESH_TOKEN');
  }

  const today = new Date();

  if (refreshTokensMatch.expiresAt < today) {
    throw new AppException('REFRESH_TOKEN_EXPIRED');
  }

  const result = await db
    .select()
    .from(UserTable)
    .innerJoin(RefreshTokenTable, eq(UserTable.id, refreshTokensMatch.userId));

  const row = result[0];
  const user = row.user;

  const {
    accessToken: newAccessToken,
    refreshTokenHash: newRefreshTokenHash,
    refreshToken: newRefreshToken,
  } = await issueTokens({
    sub: user.id,
    email: user.email,
  });

  db.transaction(async (tx) => {
    const [{ id }] = await tx
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
      .set({ revokedAt: today, replacedByTokenId: id })
      .where(eq(RefreshTokenTable.id, refreshTokensMatch.id));
  });

  return respondSuccess<{ accessToken: string; refreshToken: string }>(c, {
    message: 'Refresh token updated successfully.',
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
};
