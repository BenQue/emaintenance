'use client';

import { useEffect, useState } from 'react';
import { Camera, X, ZoomIn, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useWorkOrderStore } from '../../lib/stores/work-order-store';
import { PhotoViewModal } from './PhotoViewModal';

interface WorkOrderPhoto {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath: string | null;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

// Custom authenticated image component
const AuthenticatedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
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
          const errorText = await response.text();
          console.error('Image load error response:', errorText);
          throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setImageSrc(imageUrl);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load image:', err);
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
      <div className={`${className} bg-gray-200 flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center`}>
        <Camera className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
    />
  );
};

interface WorkOrderPhotosProps {
  workOrderId: string;
}

export function WorkOrderPhotos({ workOrderId }: WorkOrderPhotosProps) {
  const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const { fetchWorkOrderPhotos } = useWorkOrderStore();

  useEffect(() => {
    loadPhotos();
  }, [workOrderId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if we have authentication token before making the request
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found, skipping photo loading');
        setError('请先登录');
        return;
      }
      
      const photosData = await fetchWorkOrderPhotos(workOrderId);
      setPhotos(photosData || []);
    } catch (err) {
      console.error('Failed to load work order photos:', err);
      const errorMessage = err instanceof Error ? err.message : '加载照片失败';
      
      // Provide more specific error messages
      if (errorMessage.includes('工单不存在')) {
        setError('工单不存在或无访问权限');
      } else if (errorMessage.includes('认证') || errorMessage.includes('token')) {
        setError('认证已过期，请重新登录');
      } else {
        setError('加载照片失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = (photo: WorkOrderPhoto) => {
    const baseUrl = process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || 'http://localhost:3002';
    return `${baseUrl}/api/work-orders/${workOrderId}/work-order-photos/${photo.id}`;
  };

  const getThumbnailUrl = (photo: WorkOrderPhoto) => {
    const baseUrl = process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || 'http://localhost:3002';
    return photo.thumbnailPath 
      ? `${baseUrl}/api/work-orders/${workOrderId}/work-order-photos/${photo.id}/thumbnail`
      : getPhotoUrl(photo);
  };

  const downloadPhoto = async (photo: WorkOrderPhoto) => {
    try {
      // Create authenticated download request
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getPhotoUrl(photo), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = photo.originalName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download photo:', error);
    }
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Camera className="w-5 h-5 mr-2" />
报修照片
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Camera className="w-5 h-5 mr-2" />
报修照片
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadPhotos} variant="outline">
              重新加载
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Camera className="w-5 h-5 mr-2" />
报修照片
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无照片</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Camera className="w-5 h-5 mr-2" />
报修照片 ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer"
                onClick={() => setSelectedPhotoIndex(index)}
              >
                {/* Actual Image */}
                <AuthenticatedImage
                  src={getThumbnailUrl(photo)}
                  alt={photo.originalName}
                  className="w-full h-full object-cover"
                />

                {/* Hover overlay with download button */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center pointer-events-none">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPhoto(photo);
                      }}
                      className="h-8 w-8 p-0 pointer-events-auto"
                      title="下载图片"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Photo info - smaller overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 pointer-events-none">
                  <p className="text-white text-xs truncate">{photo.originalName}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photo View Modal */}
      {selectedPhotoIndex !== null && (
        <PhotoViewModal
          photos={photos.map(photo => ({
            id: photo.id,
            url: getPhotoUrl(photo),
            name: photo.originalName,
            size: photo.fileSize,
            uploadedAt: photo.uploadedAt,
          }))}
          initialIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onDownload={(photoIndex) => downloadPhoto(photos[photoIndex])}
        />
      )}
    </>
  );
}