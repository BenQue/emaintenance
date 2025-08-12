'use client';

import { useState } from 'react';
import { format, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CheckCircle, User, Calendar, Tag, Image as ImageIcon } from 'lucide-react';
import { ResolutionRecord, FaultCodeLabels } from '../../lib/types/work-order';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { PhotoViewModal } from './PhotoViewModal';
import { AuthenticatedImage } from '../ui/AuthenticatedImage';

// Safe date formatting utility
const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
  if (!dateValue) return '未设置';
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  if (!isValid(date)) {
    console.warn('Invalid date value in resolution record:', dateValue);
    return '无效日期';
  }
  
  return format(date, formatString, { locale: zhCN });
};

interface ResolutionRecordDisplayProps {
  resolutionRecord: ResolutionRecord;
}

export function ResolutionRecordDisplay({ resolutionRecord }: ResolutionRecordDisplayProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPhotoIndex(null);
  };

  const handleDownload = (index: number) => {
    const photo = resolutionRecord.photos[index];
    if (photo) {
      // Trigger download by creating a temporary anchor element
      const link = document.createElement('a');
      link.href = photo.filePath;
      link.download = photo.originalName;
      link.click();
    }
  };

  // Convert ResolutionPhoto to PhotoViewModal expected format
  const modalPhotos = resolutionRecord.photos.map(photo => ({
    id: photo.id,
    url: photo.filePath,
    name: photo.originalName || photo.filename || 'unknown',
    size: photo.fileSize || 0,
    uploadedAt: photo.uploadedAt ? new Date(photo.uploadedAt).toISOString() : new Date().toISOString(),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center text-green-700">
          <CheckCircle className="w-5 h-5 mr-2" />
          解决方案记录
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Solution Description */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">解决方案</h4>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
            {resolutionRecord.solutionDescription}
          </p>
        </div>

        {/* Fault Code */}
        {resolutionRecord.faultCode && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">故障代码</h4>
            <Badge variant="outline" className="flex items-center w-fit">
              <Tag className="w-3 h-3 mr-1" />
              {FaultCodeLabels[resolutionRecord.faultCode]}
            </Badge>
          </div>
        )}

        {/* Resolver Information */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">解决人员</h4>
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">
              {resolutionRecord.resolvedBy ? 
                `${resolutionRecord.resolvedBy.firstName || '未知'} ${resolutionRecord.resolvedBy.lastName || ''}`.trim() 
                : '解决人员信息不可用'
              }
            </span>
          </div>
          <p className="text-sm text-gray-600 ml-6">
            {resolutionRecord.resolvedBy?.email || '邮箱信息不可用'}
          </p>
        </div>

        {/* Completion Time */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">完成时间</h4>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">
              {safeFormatDate(resolutionRecord.completedAt, 'yyyy年MM月dd日 HH:mm')}
            </span>
          </div>
        </div>

        {/* Resolution Photos */}
        {resolutionRecord.photos.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <ImageIcon className="w-4 h-4 mr-1" />
              完成照片 ({resolutionRecord.photos.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resolutionRecord.photos.map((photo, index) => (
                <div 
                  key={photo.id} 
                  className="relative group cursor-pointer"
                  onClick={() => handlePhotoClick(index)}
                >
                  <AuthenticatedImage
                    src={photo.filePath}
                    alt={photo.originalName}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 group-hover:border-gray-300 transition-colors"
                    onError={() => {
                      console.error('Failed to load ResolutionPhoto in display:', photo.filePath);
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-sm text-white bg-black bg-opacity-60 rounded px-2 py-1 truncate">
                      {photo.originalName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Photo Details */}
            <div className="mt-3 space-y-1">
              {resolutionRecord.photos.map((photo) => (
                <div key={photo.id} className="text-sm text-gray-600 flex justify-between">
                  <span className="truncate">{photo.originalName}</span>
                  <span>
                    {(photo.fileSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo View Modal */}
        {isModalOpen && selectedPhotoIndex !== null && (
          <PhotoViewModal
            photos={modalPhotos}
            initialIndex={selectedPhotoIndex}
            onClose={handleCloseModal}
            onDownload={handleDownload}
          />
        )}
      </CardContent>
    </Card>
  );
}