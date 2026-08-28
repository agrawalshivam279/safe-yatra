/**
 * Safe Yatra — Backend Spatial Server
 * Express Rate Limiting Middleware.
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { fail } from '../utils/response';
import { env } from '../config/env';

/**
 * Factory to create a rate limiter with custom window and request thresholds.
 */
export const createRateLimiter = (
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests from this IP, please try again later.'
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max: env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true' ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true',
    handler: (_req, res) => {
      fail(res, 'RATE_LIMIT_EXCEEDED', message, 429);
    },
  });
};

/**
 * Default global API rate limiter (100 req / 15 min).
 */
export const rateLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Too many requests from this IP, please try again after 15 minutes.'
);
