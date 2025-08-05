"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAssetQRCode = generateAssetQRCode;
exports.generateAssetQRCodeBuffer = generateAssetQRCodeBuffer;
const qrcode_1 = __importDefault(require("qrcode"));
const logger_1 = __importDefault(require("./logger"));
/**
 * Generate QR code for asset
 */
async function generateAssetQRCode(assetCode, options = {}) {
    try {
        const defaultOptions = {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            ...options
        };
        // Generate QR code as data URL
        const qrCodeDataURL = await qrcode_1.default.toDataURL(assetCode, defaultOptions);
        logger_1.default.info('Generated QR code for asset', {
            assetCode,
            options: defaultOptions
        });
        return qrCodeDataURL;
    }
    catch (error) {
        logger_1.default.error('Failed to generate QR code', {
            assetCode,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error('QR code generation failed');
    }
}
/**
 * Generate QR code as buffer for file storage
 */
async function generateAssetQRCodeBuffer(assetCode, options = {}) {
    try {
        const defaultOptions = {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            ...options
        };
        const buffer = await qrcode_1.default.toBuffer(assetCode, defaultOptions);
        logger_1.default.info('Generated QR code buffer for asset', {
            assetCode,
            bufferSize: buffer.length
        });
        return buffer;
    }
    catch (error) {
        logger_1.default.error('Failed to generate QR code buffer', {
            assetCode,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error('QR code buffer generation failed');
    }
}
