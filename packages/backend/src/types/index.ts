/* Third-party modules */
import { HTTPException } from 'hono/http-exception';
import z from 'zod';

/* Types */
import { ErrorKey, ErrorMap } from '@/constants';

export type HonoEnv = {
  Variables: {
    user: {
      id: string;
    };
  };
};

export type SuccessResponse<T = void> = T extends void
  ? {
      success: true;
      message: string;
    }
  : { success: true; message: string; data: T };

export type ErrorResponse = {
  success: false;
  error: ErrorKey;
  message: string;
  details?: unknown;
};

export type ApiResponse<T = void> = SuccessResponse<T> | ErrorResponse;

export class AppException extends HTTPException {
  public readonly errorKey: ErrorKey;
  public readonly details?: unknown;

  constructor(
    key: ErrorKey,
    options?: { message?: string; details?: unknown },
  ) {
    const { status, message } = ErrorMap[key];

    super(status, {
      message: options?.message ?? message,
      cause: options?.details,
    });

    this.errorKey = key;
    this.details = options?.details;
  }
}

export const accessTokenPayloadSchema = z.object({
  subject: z.string(),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
