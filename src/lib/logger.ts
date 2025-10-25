import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'password', 'token', 'secret'],
    remove: true,
  },
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export default logger;

/**
 * Log HTTP request
 */
export function logRequest(
  method: string,
  path: string,
  userId?: string,
  duration?: number,
  status?: number,
  error?: string
) {
  const logData = {
    type: 'http_request',
    method,
    path,
    userId,
    duration_ms: duration,
    status,
    ...(error && { error }),
  };

  if (status && status >= 500) {
    logger.error(logData);
  } else if (status && status >= 400) {
    logger.warn(logData);
  } else {
    logger.info(logData);
  }
}

/**
 * Log error with context
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    type: 'error',
    message: error.message,
    stack: error.stack,
    ...context,
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, any>
) {
  logger.warn({
    type: 'security_event',
    event,
    ...details,
  });
}

/**
 * Log database query
 */
export function logDatabaseQuery(
  operation: string,
  model: string,
  duration: number,
  error?: string
) {
  logger.debug({
    type: 'database_query',
    operation,
    model,
    duration_ms: duration,
    ...(error && { error }),
  });
}
