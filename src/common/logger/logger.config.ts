import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { requestContextStorage } from '../../observability/context/request_context';

interface LogInfo extends winston.Logform.TransformableInfo {
  timestamp?: string;
  context?: string | Record<string, any>;
}

export const createLoggerConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldLogToFile = process.env.LOG_TO_FILE === 'true';

  // Attach request context to every log entry.
  const requestContextFormat = winston.format((info) => {
    const context = requestContextStorage.getStore();

    if (!context) return info;

    return {
      ...info,
      requestId: context.requestId,
      ...(context.userId && { userId: context.userId }),
      ...(context.businessId && {
        businessId: context.businessId,
      }),
    };
  });

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: isProduction ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        requestContextFormat(),
        isProduction
          ? winston.format.json()
          : winston.format.combine(
              requestContextFormat(),
              winston.format.colorize(),
              winston.format.printf((info: LogInfo) => {
                const { timestamp, level, message, context, ...meta } = info;

                const contextStr =
                  typeof context === 'object' && context !== null
                    ? JSON.stringify(context)
                    : (context as string) || '';

                const messageStr =
                  message !== undefined && message !== null
                    ? typeof message === 'object'
                      ? JSON.stringify(message)
                      : String(message)
                    : '';

                const metaStr = Object.keys(meta).length
                  ? JSON.stringify(meta)
                  : '';

                const displayContext = contextStr ? `[${contextStr}] ` : '';

                const displayTimestamp =
                  typeof timestamp === 'string' ? timestamp : '';

                return `[${displayTimestamp}] [${level}] ${displayContext}${messageStr} ${metaStr}`.trim();
              }),
            ),
      ),
    }),
  ];

  if (shouldLogToFile) {
    const fileLogFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      requestContextFormat(),
      winston.format.json(),
    );

    transports.push(
      new DailyRotateFile({
        level: 'error',
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileLogFormat,
      }),

      new DailyRotateFile({
        level: 'info',
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileLogFormat,
      }),
    );
  }

  return WinstonModule.createLogger({ transports });
};
