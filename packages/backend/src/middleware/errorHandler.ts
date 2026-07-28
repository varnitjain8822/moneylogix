import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'moneylogix-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
  res.status(500).json({ error: 'Internal server error' });
};
