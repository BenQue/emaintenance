"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
// Create logger configuration
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: {
        service: 'asset-service',
        version: '1.0.0'
    },
    transports: [
        // Write all logs to console in development
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }),
        // Write error logs to error.log file
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
        }),
        // Write all logs to combined.log file
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
        })
    ]
});
// If we're not in production, add console logging with colors
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
        }))
    }));
}
exports.default = logger;
