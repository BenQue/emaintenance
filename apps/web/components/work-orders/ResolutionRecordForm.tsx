'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, X, AlertCircle, Check } from 'lucide-react';
import { FaultCode, FaultCodeLabels, CreateResolutionRequest } from '../../lib/types/work-order';
import { FormWrapper } from '../forms/unified/FormWrapper';
import { UnifiedFormField } from '../forms/unified/FormField';
import { workOrderValidationRules } from '../forms/unified/FormValidation';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';

interface ResolutionRecordFormProps {
  workOrderId: string;
  onSubmit: (resolutionData: CreateResolutionRequest, photos?: File[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface ResolutionFormData {
  solutionDescription: string;
  faultCode: FaultCode | 'NONE';
  photos: FileList | null;
}

export function ResolutionRecordForm({
  workOrderId,
  onSubmit,
  onCancel,
  loading = false,
}: ResolutionRecordFormProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [error, setError] = useState('');

  // React Hook Form setup
  const form = useForm<ResolutionFormData>({
    defaultValues: {
      solutionDescription: '',
      faultCode: 'NONE',
      photos: null,
    },
    mode: 'onChange',
  });

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

  const onFormSubmit = async (data: ResolutionFormData) => {
    if (!data.solutionDescription.trim()) {
      setError('请输入解决方案描述');
      return;
    }

    if (data.solutionDescription.trim().length < 10) {
      setError('解决方案描述至少需要10个字符');
      return;
    }

    setError('');
    
    try {
      // Submit completion data without photos first, then upload photos separately
      await onSubmit({
        solutionDescription: data.solutionDescription.trim(),
        faultCode: data.faultCode && data.faultCode !== 'NONE' ? data.faultCode : undefined,
        // Don't include photos in completion request anymore
      }, selectedPhotos.length > 0 ? selectedPhotos : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center text-bizlink-700">
          <Check className="w-5 h-5 mr-2" />
          完成工单
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormWrapper
          form={form}
          onSubmit={onFormSubmit}
          submitButtonText={loading ? '提交中...' : '完成工单'}
          onCancel={onCancel}
          loading={loading}
          className="space-y-6"
        >
          {/* Solution Description */}
          <UnifiedFormField
            control={form.control}
            name="solutionDescription"
            label="解决方案描述"
            type="textarea"
            placeholder="请详细描述问题解决过程和方案，至少10个字符..."
            description="请提供详细的解决方案描述，包括使用的方法、更换的零件等"
            className="min-h-[100px]"
          />

          {/* Fault Code Selection */}
          <UnifiedFormField
            control={form.control}
            name="faultCode"
            label="故障代码"
            type="select"
            placeholder="请选择故障类型"
            description="选择最符合的故障类型代码（可选）"
            options={[
              { value: 'NONE', label: '-- 请选择故障类型 --' },
              ...Object.entries(FaultCodeLabels).map(([code, label]) => ({
                value: code,
                label: label
              }))
            ]}
          />

          {/* Photo Upload */}
          <div className="space-y-3">
            <Label className="text-bizlink-700 font-medium">完成照片（可选）</Label>
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
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-input rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  选择图片
                </label>
                <span className="ml-3 text-sm text-muted-foreground">
                  最多 5 张，每张不超过 10MB
                </span>
              </div>

              {/* Selected Photos Preview */}
              {selectedPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-bizlink-700">已选择的图片:</p>
                  <div className="space-y-2">
                    {selectedPhotos.map((photo, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                        <span className="text-sm text-muted-foreground truncate">
                          {photo.name} ({(photo.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePhoto(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Character Count for Description */}
          <div className="text-xs text-muted-foreground">
            {form.watch('solutionDescription')?.length || 0} 字符 (最少10个字符)
          </div>

        </FormWrapper>
      </CardContent>
    </Card>
  );
}