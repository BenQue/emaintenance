'use client';

import { useEffect, useRef, useState } from 'react';
import QRCodeGenerator from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export function QRCode({ value, size = 80, className = '', onClick }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      if (!canvasRef.current) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        await QRCodeGenerator.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError('QR生成失败');
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [value, size]);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border border-gray-300 rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-red-500">QR错误</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div 
          className="flex items-center justify-center bg-gray-100 border border-gray-300 rounded animate-pulse"
          style={{ width: size, height: size }}
        >
          <span className="text-xs text-gray-500">生成中...</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`${isLoading ? 'hidden' : 'block'} rounded border border-gray-200 ${onClick ? 'cursor-pointer hover:border-blue-400 transition-colors' : ''}`}
        onClick={onClick}
        title={`设备编码: ${value}`}
      />
    </div>
  );
}