'use client';

import { useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { Button } from './button';
import { QRCode } from './QRCode';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetCode: string;
  assetName: string;
}

export function QRCodeModal({ isOpen, onClose, assetCode, assetName }: QRCodeModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Create a temporary canvas for download
      const canvas = document.createElement('canvas');
      const QRCodeGenerator = (await import('qrcode')).default;
      
      await QRCodeGenerator.toCanvas(canvas, assetCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `设备-${assetCode}-QR码.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('下载失败，请重试');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>设备 QR 码 - ${assetCode}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                text-align: center; 
              }
              .qr-container { 
                display: inline-block; 
                padding: 20px; 
                border: 1px solid #ccc; 
              }
              h2 { margin: 10px 0; }
              p { margin: 5px 0; color: #666; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>${assetName}</h2>
              <p>设备编码: ${assetCode}</p>
              <canvas id="qr-canvas"></canvas>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <script>
              QRCode.toCanvas(document.getElementById('qr-canvas'), '${assetCode}', {
                width: 200,
                margin: 2
              }, function() {
                window.print();
                window.close();
              });
            </script>
          </body>
        </html>
      `);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">设备 QR 码</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-1">{assetName}</h4>
            <p className="text-sm text-gray-600">设备编码: {assetCode}</p>
          </div>

          <div className="flex justify-center mb-6">
            <QRCode value={assetCode} size={200} />
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? '下载中...' : '下载'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              打印
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}