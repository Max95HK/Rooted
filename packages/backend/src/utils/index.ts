/* Types */
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { SuccessResponse } from '@/types';

export function respondSuccess<T = void>(
  c: Context,
  message: string,
  data?: T,
  status: ContentfulStatusCode = 200,
) {
  const body =
    data === undefined
      ? { success: true, message }
      : ({ success: true, message, data } as SuccessResponse<T>);

  return c.json(body, status);
}
