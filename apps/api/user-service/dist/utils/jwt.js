"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.getExpirationTime = getExpirationTime;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable must be set in production');
    }
    return 'dev-secret-key-change-in-production';
})();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
/**
 * Generate a JWT token for a user
 */
function generateToken(payload) {
    const options = {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'emaintenance-user-service',
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, options);
}
/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
}
/**
 * Get expiration time in seconds from JWT_EXPIRES_IN
 */
function getExpirationTime() {
    // Convert JWT_EXPIRES_IN to seconds
    const timeStr = JWT_EXPIRES_IN;
    const time = parseInt(timeStr);
    if (timeStr.endsWith('h')) {
        return time * 3600; // hours to seconds
    }
    else if (timeStr.endsWith('d')) {
        return time * 86400; // days to seconds
    }
    else if (timeStr.endsWith('m')) {
        return time * 60; // minutes to seconds
    }
    return time; // assume seconds
}
