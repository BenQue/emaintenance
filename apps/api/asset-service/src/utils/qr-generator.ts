import QRCode from 'qrcode';
import logger from './logger';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate QR code for asset
 */
export async function generateAssetQRCode(
  assetCode: string,
  options: QRCodeOptions = {}
): Promise<string> {
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
    const qrCodeDataURL = await QRCode.toDataURL(assetCode, defaultOptions);
    
    logger.info('Generated QR code for asset', { 
      assetCode,
      options: defaultOptions 
    });
    
    return qrCodeDataURL;
  } catch (error) {
    logger.error('Failed to generate QR code', { 
      assetCode, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw new Error('QR code generation failed');
  }
}

/**
 * Generate QR code as buffer for file storage
 */
export async function generateAssetQRCodeBuffer(
  assetCode: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
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

    const buffer = await QRCode.toBuffer(assetCode, defaultOptions);
    
    logger.info('Generated QR code buffer for asset', { 
      assetCode,
      bufferSize: buffer.length 
    });
    
    return buffer;
  } catch (error) {
    logger.error('Failed to generate QR code buffer', { 
      assetCode, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw new Error('QR code buffer generation failed');
  }
}