import type { PaginationMeta } from '~~/types/models/pagination';

export type ApiFieldErrors = Record<string, string[]>;
export type ApiErrorDetails = Record<string, unknown>;

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiResponseFailure {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: ApiFieldErrors;
    details?: ApiErrorDetails;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseFailure;

export type PaginatedApiResponse<T> =
  | (ApiResponseSuccess<T> & {
      pagination: PaginationMeta;
    })
  | ApiResponseFailure;

export interface ApiErrorOptions {
  status: number;
  statusText: string;
  message: string;
  code?: string;
  fieldErrors?: ApiFieldErrors;
  details?: ApiErrorDetails;
  cause?: unknown;
}

export interface ParsedApiError {
  message: string;
  code: string;
  status?: number;
  statusText?: string;
  fieldErrors: ApiFieldErrors;
  details: ApiErrorDetails;
}

export interface ApiAdminUserPayload {
  id: number;
  username: string;
  name: string;
  isAdmin: boolean;
  createdAt: Date | string;
  lastLoginAt: Date | string;
}

export interface ApiSessionUserPayload {
  id: number;
  username: string;
  name: string;
}

export interface ApiAuthenticationPayload {
  authenticated: true;
}

export interface ApiRegistrationPayload {
  user: ApiSessionUserPayload;
}

export interface ApiDeletedPayload {
  deleted: true;
}

export interface ApiBatchDeletePayload {
  deleted: number;
}

export interface ApiCacheClearPayload {
  cleared: true;
}

export interface ApiHealthPayload {
  status: 'ok';
  timestamp: number;
}
