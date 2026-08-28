/**
 * Safe Yatra — Backend Spatial Server
 * Standardized API Response Envelope & Custom Error Definitions.
 */

import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Custom application operational error.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 400,
    code = 'BAD_REQUEST',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Standard success response helper.
 */
export const ok = <T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>,
  statusCode = 200
): Response => {
  const responsePayload: ApiSuccessResponse<T> = {
    success: true,
    data,
    error: null,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(responsePayload);
};

/**
 * Standard failure response helper.
 */
export const fail = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown,
  meta?: Record<string, unknown>
): Response => {
  const responsePayload: ApiErrorResponse = {
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(responsePayload);
};
