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
  attachments?: string[]; // Add attachments prop to display report photos
}

export function WorkOrderPhotos({ workOrderId, attachments = [] }: WorkOrderPhotosProps) {
  const [managedPhotos, setManagedPhotos] = useState<WorkOrderPhoto[]>([]); // Photos from WorkOrderPhoto table
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const { fetchWorkOrderPhotos } = useWorkOrderStore();

  useEffect(() => {
    // Only load managed photos if there are no attachments (or if we want both)
    // For now, prioritize showing attachments (report photos) over managed photos
    if (attachments.length === 0) {
      loadManagedPhotos();
    }
  }, [workOrderId, attachments]);

  const loadManagedPhotos = async () => {
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
      setManagedPhotos(photosData || []);
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

  // Helper functions for managed photos (WorkOrderPhoto table)
  const getManagedPhotoUrl = (photo: WorkOrderPhoto) => {
    const baseUrl = process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || 'http://localhost:3002';
    return `${baseUrl}/api/work-orders/${workOrderId}/work-order-photos/${photo.id}`;
  };

  const getManagedThumbnailUrl = (photo: WorkOrderPhoto) => {
    const baseUrl = process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || 'http://localhost:3002';
    return photo.thumbnailPath 
      ? `${baseUrl}/api/work-orders/${workOrderId}/work-order-photos/${photo.id}/thumbnail`
      : getManagedPhotoUrl(photo);
  };

  // Helper functions for attachment photos (report photos)
  const getAttachmentPhotoUrl = (attachmentUrl: string) => {
    // Attachments are stored as full URLs, just return them
    return attachmentUrl;
  };

  const downloadManagedPhoto = async (photo: WorkOrderPhoto) => {
    try {
      // Create authenticated download request
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getManagedPhotoUrl(photo), {
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

  const downloadAttachmentPhoto = async (attachmentUrl: string, filename?: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(attachmentUrl, {
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
      link.download = filename || 'attachment.jpg';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download attachment photo:', error);
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

  // Determine which photos to display - prioritize attachments (report photos)
  const displayPhotos = attachments.length > 0 ? attachments : [];
  const hasPhotos = displayPhotos.length > 0;

  if (!hasPhotos) {
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
报修照片 ({displayPhotos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayPhotos.map((attachmentUrl, index) => {
              // Extract filename from URL for display
              const filename = attachmentUrl.split('/').pop() || `attachment-${index + 1}`;
              const displayName = filename.replace(/^\d+-\d+-/, ''); // Remove timestamp prefix
              
              return (
                <div
                  key={`attachment-${index}`}
                  className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer"
                  onClick={() => setSelectedPhotoIndex(index)}
                >
                  {/* Actual Image */}
                  <AuthenticatedImage
                    src={getAttachmentPhotoUrl(attachmentUrl)}
                    alt={displayName}
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
                          downloadAttachmentPhoto(attachmentUrl, displayName);
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
                    <p className="text-white text-xs truncate">{displayName}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Photo View Modal */}
      {selectedPhotoIndex !== null && (
        <PhotoViewModal
          photos={displayPhotos.map((attachmentUrl, index) => {
            const filename = attachmentUrl.split('/').pop() || `attachment-${index + 1}`;
            const displayName = filename.replace(/^\d+-\d+-/, '');
            return {
              id: `attachment-${index}`,
              url: getAttachmentPhotoUrl(attachmentUrl),
              name: displayName,
              size: 0, // Unknown size for attachments
              uploadedAt: '', // Unknown upload time for attachments
            };
          })}
          initialIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onDownload={(photoIndex) => downloadAttachmentPhoto(displayPhotos[photoIndex], displayPhotos[photoIndex].split('/').pop())}
        />
      )}
    </>
  );
}