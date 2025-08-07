'use client';

import { useEffect, useState } from 'react';
import { Camera, X, ZoomIn, Download } from 'lucide-react';
import Image from 'next/image';
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
      const photosData = await fetchWorkOrderPhotos(workOrderId);
      setPhotos(photosData || []);
    } catch (err) {
      console.error('Failed to load work order photos:', err);
      setError('加载照片失败');
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = (photo: WorkOrderPhoto) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    return `${baseUrl}/api/work-orders/${workOrderId}/work-order-photos/${photo.id}`;
  };

  const getThumbnailUrl = (photo: WorkOrderPhoto) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    return photo.thumbnailPath 
      ? `${baseUrl}/api/work-orders/${workOrderId}/work-order-photos/${photo.id}/thumbnail`
      : getPhotoUrl(photo);
  };

  const downloadPhoto = (photo: WorkOrderPhoto) => {
    const link = document.createElement('a');
    link.href = getPhotoUrl(photo);
    link.download = photo.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            工单照片
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
            工单照片
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
            工单照片
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
            工单照片 ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
              >
                {/* Thumbnail Image */}
                <Image
                  src={getThumbnailUrl(photo)}
                  alt={photo.originalName}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-2 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedPhotoIndex(index)}
                      className="h-8 w-8 p-0"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => downloadPhoto(photo)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Photo info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                  <p className="text-white text-xs truncate">{photo.originalName}</p>
                  <p className="text-gray-300 text-xs">
                    {formatFileSize(photo.fileSize)} • {formatDate(photo.uploadedAt)}
                  </p>
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