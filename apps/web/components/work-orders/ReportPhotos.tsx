'use client';

import { useState } from 'react';
import { Camera, ZoomIn, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { PhotoViewModal } from './PhotoViewModal';

interface ReportPhotosProps {
  attachments: string[];
  workOrderTitle: string;
}

export function ReportPhotos({ attachments, workOrderTitle }: ReportPhotosProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);


  if (!attachments || attachments.length === 0) {
    return null;
  }

  // Filter only image attachments (more flexible check)
  const imageAttachments = attachments.filter(url => {
    const extension = url.split('.').pop()?.split('?')[0]?.toLowerCase();
    const hasImageExtension = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '');
    const isUnsplashImage = url.includes('images.unsplash.com');
    const isImageUrl = url.includes('image') || url.includes('photo');
    
    
    return hasImageExtension || isUnsplashImage || isImageUrl;
  });

  // If no images, don't render anything
  if (imageAttachments.length === 0) {
    return null;
  }

  const formatImageName = (url: string, index: number): string => {
    const filename = url.split('/').pop() || `报修照片_${index + 1}`;
    return decodeURIComponent(filename);
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const formatFileSize = (url: string): string => {
    // Since we don't have file size info in attachments array,
    // we'll return a placeholder or fetch it dynamically
    return '未知大小';
  };

  return (
    <>
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">报修照片 ({imageAttachments.length})</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {imageAttachments.map((url, index) => (
            <div
              key={index}
              className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer"
              onClick={() => setSelectedPhotoIndex(index)}
            >
              {/* Image */}
              <img
                src={url}
                alt={formatImageName(url, index)}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-gray-200">
                        <div class="text-center">
                          <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <p class="text-xs text-gray-500">图片加载失败</p>
                        </div>
                      </div>
                    `;
                  }
                }}
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 flex space-x-2 transition-opacity duration-200">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoIndex(index);
                    }}
                    className="h-8 w-8 p-0"
                    title="查看大图"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(url, formatImageName(url, index));
                    }}
                    className="h-8 w-8 p-0"
                    title="下载图片"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Photo name at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <p className="text-white text-xs truncate">{formatImageName(url, index)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Non-image attachments (if any) */}
        {attachments.length > imageAttachments.length && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">其他附件</h5>
            <div className="space-y-2">
              {attachments
                .filter(url => {
                  const extension = url.split('.').pop()?.toLowerCase();
                  return !['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '');
                })
                .map((url, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-300 rounded flex-shrink-0"></div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm truncate"
                    >
                      {formatImageName(url, index)}
                    </a>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo View Modal */}
      {selectedPhotoIndex !== null && (
        <PhotoViewModal
          photos={imageAttachments.map((url, index) => ({
            id: `attachment-${index}`,
            url: url,
            name: formatImageName(url, index),
            size: 0, // We don't have size info for attachments
            uploadedAt: new Date().toISOString(), // Placeholder date
          }))}
          initialIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onDownload={(photoIndex) => downloadImage(
            imageAttachments[photoIndex], 
            formatImageName(imageAttachments[photoIndex], photoIndex)
          )}
        />
      )}
    </>
  );
}