/* Third-party modules */
import { Hono } from 'hono';
import { sign, jwt } from 'hono/jwt';
import { zValidator } from '@/utils';
import z from 'zod';

/* Custom modules */
import { db } from '@/db';
import { ApiKeyTable, UserTable } from '@/db/schemas';
import { env } from '@/env';

/* Utils */
import { generateApiKey, hashPassword, verifyPassword } from '@/lib/crypto';
import { respondSuccess } from '@/utils';

/* Constants */
import { JWT_EXPIRATION_SECONDS } from '@/constants';

/* Types */
import { AppException } from '@/types';

type JwtEnv = {
  Variables: {
    jwtPayload: {
      sub: string;
      email: string;
      exp: number;
    };
  };
};

const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'A name is required for create an Api Key.')
    .max(255, 'Api Keys must be at most 255 character long.'),
});

export const apiKeysRouter = new Hono<JwtEnv>()
  .use(jwt({ secret: env.JWT_SECRET, alg: 'HS256' }))
  .post('/', zValidator('json', createApiKeySchema), async (c) => {
    const { sub: userId } = c.var.jwtPayload;
    const { name } = c.req.valid('json');

    const { rawApiKey, apiKeyPrefix, apiKeyHash } = generateApiKey();

    const [apiKey] = await db
      .insert(ApiKeyTable)
      .values({ name, userId, apiKeyHash, apiKeyPrefix })
      .returning({ id: ApiKeyTable.id });

    return respondSuccess<{
      apiKey: {
        id: string;
        value: string;
      };
    }>(c, {
      message: 'Api Key created.',
      data: {
        apiKey: {
          id: apiKey.id,
          value: rawApiKey,
        },
      },
    });
  })
  .get('/', async (c) => {
    const { sub: userId } = c.var.jwtPayload;

    const apiKeys = await db.query.ApiKeyTable.findMany({
      where: { userId },
      columns: {
        id: true,
        name: true,
        apiKeyPrefix: true,
        createdAt: true,
      },
    });

    return respondSuccess<{
      apiKeys: {
        id: string;
        createdAt: Date;
        name: string;
        apiKeyPrefix: string;
      }[];
    }>(c, { data: { apiKeys } });
  });
