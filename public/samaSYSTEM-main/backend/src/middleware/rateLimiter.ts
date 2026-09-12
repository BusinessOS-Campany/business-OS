import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

function keyGenerator(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  return (typeof forwarded === 'string' ? forwarded : req.ip) || 'unknown';
}

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, forwardedHeader: false },
  keyGenerator,
};

export const generalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 500 : 2000,
  message: { error: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 50,
  message: { error: 'Too many login attempts, please try again later' },
});
