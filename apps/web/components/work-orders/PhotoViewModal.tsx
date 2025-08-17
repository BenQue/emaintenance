'use client';

import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

// Authenticated image component for modal
const ModalAuthenticatedImage: React.FC<{
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
}> = ({ src, alt, style, className }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Check if this is a static file URL (uploads)
        const isStaticFile = src.includes('/uploads/');
        
        if (isStaticFile) {
          // For static files, try without authentication first
          const response = await fetch(src);
          
          if (!response.ok) {
            throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          setImageSrc(imageUrl);
          setLoading(false);
        } else {
          // For API endpoints, use authentication
          const token = localStorage.getItem('auth_token');
          
          if (!token) {
            throw new Error('No authentication token found');
          }

          const response = await fetch(src, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          setImageSrc(imageUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load modal image:', err);
        setError(true);
        setLoading(false);
      }
    };

    if (src) {
      loadImage();
    }

    // Cleanup function to revoke object URL
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, imageSrc]);

  if (loading) {
    return (
      <div className={`${className} bg-gray-900 flex items-center justify-center`} style={style}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`${className} bg-gray-900 flex items-center justify-center`} style={style}>
        <div className="text-center">
          <div className="text-white text-lg mb-2">图片加载失败</div>
          <div className="text-gray-400 text-sm">{alt}</div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
    />
  );
};

interface Photo {
  id: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

interface PhotoViewModalProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  onDownload: (index: number) => void;
}

export function PhotoViewModal({ photos, initialIndex, onClose, onDownload }: PhotoViewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom and rotation when switching photos
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          event.preventDefault();
          resetZoom();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          rotate();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentPhoto = photos[currentIndex];
  
  // Safety check - if currentPhoto is undefined, don't render
  if (!currentPhoto) {
    console.error('PhotoViewModal: currentPhoto is undefined', { currentIndex, photosLength: photos.length });
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 3));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.5));
  };

  const resetZoom = () => {
    setZoom(1);
    setRotation(0);
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Modal Background - Close on click */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose}
      />

      {/* Photo Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Main Image */}
        <div 
          className="relative max-w-full max-h-full cursor-grab active:cursor-grabbing"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-in-out',
          }}
        >
          <ModalAuthenticatedImage
            src={currentPhoto.url}
            alt={currentPhoto.name}
            className="max-w-full max-h-full object-contain"
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '80vh',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Navigation Buttons */}
        {photos.length > 1 && (
          <>
            <Button
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-12 w-12 p-0 bg-black bg-opacity-50 hover:bg-opacity-75"
              onClick={goToPrevious}
              variant="ghost"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </Button>
            <Button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 h-12 w-12 p-0 bg-black bg-opacity-50 hover:bg-opacity-75"
              onClick={goToNext}
              variant="ghost"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </Button>
          </>
        )}

        {/* Top Toolbar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          {/* Photo Info */}
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2 text-white">
            <h3 className="text-lg font-semibold truncate max-w-64">{currentPhoto.name}</h3>
            <p className="text-sm text-gray-300">
              {currentIndex + 1} / {photos.length}
              {currentPhoto.size > 0 && ` • ${formatFileSize(currentPhoto.size)}`}
              {currentPhoto.uploadedAt && ` • ${formatDate(currentPhoto.uploadedAt)}`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="bg-black bg-opacity-50 rounded-lg flex items-center">
              <Button
                className="h-10 px-3 text-white hover:bg-white hover:bg-opacity-10"
                onClick={zoomOut}
                variant="ghost"
                title="缩小 (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-white px-2 text-sm min-w-16 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                className="h-10 px-3 text-white hover:bg-white hover:bg-opacity-10"
                onClick={zoomIn}
                variant="ghost"
                title="放大 (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            {/* Rotate Button */}
            <Button
              className="h-10 px-3 bg-black bg-opacity-50 text-white hover:bg-white hover:bg-opacity-10"
              onClick={rotate}
              variant="ghost"
              title="旋转 (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            {/* Reset Button */}
            <Button
              className="h-10 px-3 bg-black bg-opacity-50 text-white hover:bg-white hover:bg-opacity-10"
              onClick={resetZoom}
              variant="ghost"
              title="重置 (0)"
            >
              <span className="text-sm">重置</span>
            </Button>

            {/* Download Button */}
            <Button
              className="h-10 px-3 bg-black bg-opacity-50 text-white hover:bg-white hover:bg-opacity-10"
              onClick={() => onDownload(currentIndex)}
              variant="ghost"
              title="下载"
            >
              <Download className="w-4 h-4" />
            </Button>

            {/* Close Button */}
            <Button
              className="h-10 px-3 bg-black bg-opacity-50 text-white hover:bg-white hover:bg-opacity-10"
              onClick={onClose}
              variant="ghost"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Bottom Navigation Dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black bg-opacity-50 rounded-full px-4 py-2">
            {photos.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 rounded-lg px-3 py-2 text-xs text-gray-300">
          <p>键盘快捷键: ← → 导航 | + - 缩放 | R 旋转 | 0 重置 | Esc 关闭</p>
        </div>
      </div>
    </div>
  );
}