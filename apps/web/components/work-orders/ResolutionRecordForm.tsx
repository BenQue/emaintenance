'use client';

import { useState } from 'react';
import { Check, Upload, X, AlertCircle } from 'lucide-react';
import { FaultCode, FaultCodeLabels, CreateResolutionRequest } from '../../lib/types/work-order';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ResolutionRecordFormProps {
  workOrderId: string;
  onSubmit: (resolutionData: CreateResolutionRequest, photos?: File[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ResolutionRecordForm({
  workOrderId,
  onSubmit,
  onCancel,
  loading = false,
}: ResolutionRecordFormProps) {
  const [solutionDescription, setSolutionDescription] = useState('');
  const [faultCode, setFaultCode] = useState<FaultCode | undefined>();
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [error, setError] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      if (!isValid) {
        setError(`文件 "${file.name}" 不是有效的图片格式`);
      }
      return isValid;
    });

    // Validate file sizes (max 10MB per file)
    const validSizedFiles = validFiles.filter(file => {
      const isValid = file.size <= 10 * 1024 * 1024;
      if (!isValid) {
        setError(`文件 "${file.name}" 超过 10MB 大小限制`);
      }
      return isValid;
    });

    if (validSizedFiles.length + selectedPhotos.length > 5) {
      setError('最多只能上传 5 张图片');
      return;
    }

    setSelectedPhotos(prev => [...prev, ...validSizedFiles]);
    setError('');
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!solutionDescription.trim()) {
      setError('请输入解决方案描述');
      return;
    }

    if (solutionDescription.trim().length < 10) {
      setError('解决方案描述至少需要10个字符');
      return;
    }

    setError('');
    
    try {
      // Submit completion data without photos first, then upload photos separately
      await onSubmit({
        solutionDescription: solutionDescription.trim(),
        faultCode,
        // Don't include photos in completion request anymore
      }, selectedPhotos.length > 0 ? selectedPhotos : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Check className="w-5 h-5 mr-2" />
          完成工单
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Solution Description */}
          <div>
            <label htmlFor="solution" className="block text-sm font-medium text-gray-700 mb-2">
              解决方案描述 <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(至少10个字符)</span>
            </label>
            <textarea
              id="solution"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="请详细描述问题解决过程和方案，至少10个字符..."
              value={solutionDescription}
              onChange={(e) => setSolutionDescription(e.target.value)}
              required
            />
          </div>

          {/* Fault Code Selection */}
          <div>
            <label htmlFor="faultCode" className="block text-sm font-medium text-gray-700 mb-2">
              故障代码 (可选)
            </label>
            <select
              id="faultCode"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={faultCode || ''}
              onChange={(e) => setFaultCode(e.target.value as FaultCode || undefined)}
            >
              <option value="">-- 请选择故障类型 --</option>
              {Object.entries(FaultCodeLabels).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Photo Upload */}
          <div>
            <label htmlFor="photos" className="block text-sm font-medium text-gray-700 mb-2">
              完成照片 (可选)
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="file"
                  id="photos"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label
                  htmlFor="photos"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  选择图片
                </label>
                <span className="ml-3 text-sm text-gray-500">
                  最多 5 张，每张不超过 10MB
                </span>
              </div>

              {/* Selected Photos Preview */}
              {selectedPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">已选择的图片:</p>
                  <div className="space-y-2">
                    {selectedPhotos.map((photo, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <span className="text-sm text-gray-700 truncate">
                          {photo.name} ({(photo.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={loading || !solutionDescription.trim() || solutionDescription.trim().length < 10}
              className="flex-1"
            >
              {loading ? '提交中...' : '完成工单'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}