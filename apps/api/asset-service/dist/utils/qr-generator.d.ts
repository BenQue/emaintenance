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
export declare function generateAssetQRCode(assetCode: string, options?: QRCodeOptions): Promise<string>;
/**
 * Generate QR code as buffer for file storage
 */
export declare function generateAssetQRCodeBuffer(assetCode: string, options?: QRCodeOptions): Promise<Buffer>;
//# sourceMappingURL=qr-generator.d.ts.map