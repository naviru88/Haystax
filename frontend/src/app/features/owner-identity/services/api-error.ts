import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mapping of backend ErrorResponse (openapi-owner.yaml) and Supabase/Auth errors
 * onto one ApiError the pages can render. [AGENTS C1 error mapping]
 */
export interface FieldError {
  field: string;      // matches a form control name (or 'form' for unknown fields)
  message: string;
}

export type ApiErrorKind = 'auth' | 'forbidden' | 'notfound' | 'conflict' | 'validation' | 'network' | 'server';

export class ApiError extends Error {
  readonly status: number | null;
  readonly kind: ApiErrorKind;
  readonly fieldErrors: FieldError[];

  constructor(status: number | null, kind: ApiErrorKind, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.fieldErrors = fieldErrors;
  }
}

const BODY_PATTERN = /^<html/i;

/** Map an HTTP error to ApiError from the backend ErrorResponse shape (or network/unknown). */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string; fieldErrors?: Array<{ field: string; message: string }> } | null;
    const message =
      body && typeof body.message === 'string' && !BODY_PATTERN.test(body.message)
        ? body.message
        : err.statusText || 'Request failed';

    const fieldErrors: FieldError[] =
      Array.isArray(body?.fieldErrors) && body!.fieldErrors.length > 0
        ? body!.fieldErrors.map(fe => ({ field: fe.field ?? 'form', message: fe.message ?? message }))
        : [];

    const kind: ApiErrorKind =
      err.status === 0 || err.status === null ? 'network' :
      err.status === 401 ? 'auth' :
      err.status === 403 ? 'forbidden' :
      err.status === 404 ? 'notfound' :
      err.status === 409 ? 'conflict' :
      err.status === 422 ? 'validation' :
      err.status >= 500 ? 'server' : 'server';

    return new ApiError(err.status, kind, message, fieldErrors);
  }

  if (err instanceof Error) {
    // Treat a thrown "not configured" style error as a server/unavailable kind.
    return new ApiError(null, 'server', err.message);
  }

  return new ApiError(null, 'network', 'Unexpected error');
}

/** Human message per kind — used by pages that do not need the raw server text. */
export function messageFor(kind: ApiErrorKind, serverMessage: string): string {
  switch (kind) {
    case 'auth': return serverMessage || 'Invalid login credentials.';
    case 'network': return 'Cannot reach the server. Check that the backend is running and try again.';
    case 'forbidden': return serverMessage || 'You do not have permission to do that.';
    case 'notfound': return serverMessage || 'Not found.';
    case 'conflict': return serverMessage || 'This action conflicts with the current state.';
    case 'validation': return serverMessage || 'Please fix the highlighted fields.';
    default: return serverMessage || 'Something went wrong. Please try again.';
  }
}
