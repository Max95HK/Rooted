/* Third-party modules */
import { Hono } from 'hono';
import { zValidator } from '@/utils';
import z from 'zod';

/* Custom modules */
import { db } from '@/db';
import { UserTable } from '@/db/schemas';

/* Utils */
import { hashPassword } from '@/lib/crypto';
import { respondSuccess } from '@/utils';

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

export const authRouter = new Hono().post(
  '/register',
  zValidator('json', registerSchema),
  async (c) => {
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

    return respondSuccess(c, 'User created.', 201);
  },
);
