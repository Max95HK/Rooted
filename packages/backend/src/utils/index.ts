/* Third-party modules */
import { zValidator as zv } from '@hono/zod-validator';
import * as z from 'zod';

/* Types */
import type { SuccessResponse } from '@/types';
import { AppException } from '@/types';
import type { Context, ValidationTargets } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function respondSuccess<T = void>(
  c: Context,
  options?: {
    message?: string;
    data?: T;
    status?: ContentfulStatusCode;
  },
) {
  const { message, data, status = 200 } = options ?? {};

  const body =
    data === undefined
      ? { success: true, message }
      : ({ success: true, message, data } as SuccessResponse<T>);

  return c.json(body, status);
}

export const zValidator = <
  T extends z.ZodType,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) => {
  return zv(target, schema, (result) => {
    if (!result.success) {
      throw new AppException('VALIDATION_ERROR', {
        details: result.error.issues[0].message,
      });
    }
  });
};
