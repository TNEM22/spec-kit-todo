import { HttpErrorResponse } from '@angular/common/http';

/** One field problem from the server's error envelope. */
export interface FieldError {
  field: string;
  message: string;
}

/** The server's error envelope in a convenient shape (contracts/rest-api.md). */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  fields: FieldError[];
}

/** Read the error envelope from a failed request; network failures get status 0. */
export function apiErrorOf(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error?.error;
    return {
      status: error.status,
      code: typeof body?.code === 'string' ? body.code : 'http_error',
      message: typeof body?.message === 'string' ? body.message : 'Something went wrong. Try again.',
      fields: Array.isArray(body?.fields) ? body.fields : [],
    };
  }
  return { status: 0, code: 'unknown', message: 'Something went wrong. Try again.', fields: [] };
}

/** Find the server's message for one form field, if any. */
export function fieldMessage(error: ApiError, field: string): string | null {
  return error.fields.find((f) => f.field === field)?.message ?? null;
}
