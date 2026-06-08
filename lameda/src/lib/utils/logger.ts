import pino from 'pino'

/**
 * Structured logger using Pino.
 *
 * Usage:
 *   import { logger } from '@/lib/utils/logger'
 *   logger.info({ merchantId }, 'Webhook received')
 *   logger.error({ err, webhookId }, 'Signature verification failed')
 *
 * In production, logs are JSON lines shipped to your log aggregator.
 * In development, pino-pretty formats them for readability.
 *
 * TECHNICAL DEBT:
 * - Pino pretty transport uses a worker thread which is not compatible
 *   with Next.js Edge Runtime. If you move any logger calls into
 *   middleware.ts (which runs on Edge), replace this with a plain
 *   console.log or use a fetch-based transport.
 */
const isDev = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  base: {
    service: 'lameda-api',
    env: process.env.NODE_ENV,
  },
  redact: {
    // Never log these fields — PII and credentials
    // Pino redacts by key name at any depth in the logged object.
    // Add any new sensitive field names here as the schema grows.
    paths: [
      'req.headers.authorization',
      'req.headers["x-merchant-api-key"]',
      'req.headers["x-api-key"]',
      // PII
      'phone',
      'phoneNumber',
      'phone_number',
      'customerPhone',
      'email',
      'owner_name',
      'delivery_address',
      'display_name',
      // Credentials — these must never appear in logs even in dev
      'apiKey',
      'api_key',
      'botToken',
      'bot_token',
      'telegram_bot_token',
      'token',
      'webhookSecret',
      'secret',
    ],
    censor: '[REDACTED]',
  },
})
