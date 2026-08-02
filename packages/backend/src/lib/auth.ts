/* Custom modules */
import { db } from '@/db';
import { env } from '@/env';
import { RefreshTokenTable } from '@/db/schemas/refreshToken';

/* Utils */
import { generateAccessToken, generateRefreshToken } from '@/lib/crypto';
import { UserTable } from '@/db/schemas';

/* Types */
import type { DBUser } from '@/db/schemas';
import type { AccessTokenPayload } from '@/types';

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

  return { accessToken, refreshToken };
};
