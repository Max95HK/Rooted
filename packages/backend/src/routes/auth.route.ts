/* Third-party modules */
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { zValidator } from '@/utils';
import z from 'zod';

/* Custom modules */
import { db } from '@/db';
import { UserTable } from '@/db/schemas';
import { env } from '@/env';

/* Utils */
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { respondSuccess } from '@/utils';

/* Constants */
import { JWT_EXPIRATION_SECONDS } from '@/constants';

/* Types */
import { AppException } from '@/types';

const registerSchema = z.object({
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
    const { email, password } = c.req.valid('json');
    const userExists = await db.query.UserTable.findFirst({ where: { email } });

    if (userExists != null) {
      throw new AppException('CONFLICT', { message: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(UserTable)
      .values({ email, passwordHash })
      .returning({ id: UserTable.id, email: UserTable.email });

    return respondSuccess<{
      id: string;
      email: string;
    }>(c, { message: 'User created.', data: user, status: 201 });
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

    const now = Math.floor(Date.now() / 1000);

    const token = await sign(
      {
        exp: now + JWT_EXPIRATION_SECONDS,
        sub: user.id,
        email: user.email,
      },
      env.JWT_SECRET,
    );

    return respondSuccess<string>(c, { data: token });
  });
