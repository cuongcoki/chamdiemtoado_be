/**
 * Node modules
 */
import winston from 'winston';

/**
 * Custom modules
 */
import config from '../config';

const {combine, timestamp, json, printf, errors, align, colorize} =
  winston.format;

// Define the transport array to hold different logging transports
const transports: winston.transport[] = [];

// If the application is not runnig in production, add console transport
if (config.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: combine(
        timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), // add timestamp to logs
        colorize({all: true}), // add colors to log levels
        align(), // align log messages
        printf(({timestamp, level, message, ...meta}) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} ${level}: ${message} ${metaStr}`;
        }),
      ),
    }),
  );
}

// Create a logger instance using Winstan

const logger = winston.createLogger({
  level: config.LOG_LEVEL || 'info', //Set the default logging level to 'info'
  format: combine(
    timestamp(),
    errors({stack: true}), // include stack trace for errors
    json(), // Use JSON format for log messages
  ),
  transports, // Use the defined transports
  silent: config.NODE_ENV === 'test', // Disable logging in test environment
});


export {logger};