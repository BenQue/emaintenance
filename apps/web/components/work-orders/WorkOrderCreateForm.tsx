'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Priority, PriorityLabels, FaultSymptom } from '../../lib/types/work-order';
import { useWorkOrderStore } from '../../lib/stores/work-order-store';
import { assetService, Asset } from '../../lib/services/asset-service';
import { FormWrapper } from '../forms/unified/FormWrapper';
import { UnifiedFormField } from '../forms/unified/FormField';
import { FaultSymptomsSelector } from './FaultSymptomsSelector';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { MapPin, AlertTriangle } from 'lucide-react';

interface WorkOrderCreateFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormData {
  assetId: string;
  title: string;
  location: string;
  additionalLocation: string;
  priority: Priority;
  description: string;
  photos: FileList | null;
}

export function WorkOrderCreateForm({
  onCancel,
  onSuccess,
}: WorkOrderCreateFormProps) {
  const { createWorkOrder, creating, createError, clearCreateError } = useWorkOrderStore();

  // React Hook Form setup
  const form = useForm<FormData>({
    defaultValues: {
      assetId: '',
      title: '',
      location: '',
      additionalLocation: '',
      priority: Priority.MEDIUM,
      description: '',
      photos: null,
    },
    mode: 'onChange',
  });

  // New state for fault symptoms and production interrupted
  const [selectedFaultSymptoms, setSelectedFaultSymptoms] = useState<FaultSymptom[]>([]);
  const [productionInterrupted, setProductionInterrupted] = useState(false);
  const [faultSymptomError, setFaultSymptomError] = useState('');

  // Form options loaded from API
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFormData();
  }, []);

  // Auto-fill location when asset is selected
  useEffect(() => {
    const assetId = form.watch('assetId');
    if (assetId) {
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        setSelectedAsset(asset);
        form.setValue('location', asset.location);
      }
    }
  }, [form.watch('assetId'), assets, form]);

  // Auto-downgrade priority when production interrupted is unchecked
  useEffect(() => {
    if (!productionInterrupted && form.watch('priority') === Priority.URGENT) {
      form.setValue('priority', Priority.HIGH);
    }
  }, [productionInterrupted, form]);

  const loadFormData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      const assetsResponse = await assetService.getAllAssets({ isActive: true, limit: 100 });
      setAssets(assetsResponse.assets);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load form data:', error);

      if (error instanceof Error && error.message.includes('401')) {
        window.location.href = '/login';
        return;
      }

      setAssets([]);
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    // Validate fault symptoms
    if (selectedFaultSymptoms.length === 0) {
      setFaultSymptomError('请至少选择一个故障表现');
      return;
    }

    setFaultSymptomError('');
    clearCreateError();

    try {
      const photos = data.photos ? Array.from(data.photos) : [];

      await createWorkOrder({
        assetId: data.assetId,
        title: data.title.trim(),
        faultSymptoms: selectedFaultSymptoms,
        location: data.location.trim() || undefined,
        additionalLocation: data.additionalLocation.trim() || undefined,
        productionInterrupted,
        priority: data.priority,
        description: data.description.trim() || undefined,
        photos,
        // Keep backward compatibility with old category/reason fields
        category: '设备维修',
        reason: '设备故障',
      });

      onSuccess();
    } catch (error) {
      console.error('[DEBUG] Error creating work order:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bizlink-500"></div>
        <span className="ml-3 text-muted-foreground">加载表单数据...</span>
      </div>
    );
  }

  const availablePriorities = productionInterrupted
    ? [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT]
    : [Priority.LOW, Priority.MEDIUM, Priority.HIGH];

  return (
    <div className="p-6 space-y-6">
      {/* Error Display */}
      {createError && (
        <Alert variant="destructive">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">创建工单失败</h3>
              <p className="mt-1 text-sm">{createError}</p>
            </div>
          </div>
        </Alert>
      )}

      <FormWrapper
        form={form}
        onSubmit={onSubmit}
        title="创建工单"
        submitButtonText={creating ? '提交中...' : '提交工单'}
        loading={creating}
        showProgress={creating}
        submitProgress={creating ? 75 : 0}
      >
        {/* Device Selection Field */}
        <div className="space-y-2">
          <UnifiedFormField
            control={form.control}
            name="assetId"
            label="选择设备"
            type="select"
            placeholder="请选择需要维修的设备"
            options={assets.map(asset => ({
              value: asset.id,
              label: `${asset.assetCode} - ${asset.name} (${asset.location})`
            }))}
          />
        </div>

        {/* Title Field */}
        <UnifiedFormField
          control={form.control}
          name="title"
          label="工单标题"
          type="text"
          placeholder="请输入工单标题（至少5个字符）"
          description="请简要描述需要维修的问题"
        />

        {/* Fault Symptoms Selection - NEW */}
        <FaultSymptomsSelector
          selectedSymptoms={selectedFaultSymptoms}
          onChange={setSelectedFaultSymptoms}
          disabled={creating}
          error={faultSymptomError}
        />

        {/* Location Information - Auto-filled from Asset */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <Label className="text-bizlink-700 font-medium">位置信息</Label>
          </div>

          {/* Auto-filled location (read-only) */}
          <div className="bg-gray-50 border border-gray-300 rounded-md p-3">
            <Label className="text-xs text-gray-500">设备位置（自动获取）</Label>
            <p className="mt-1 text-sm text-gray-900">
              {form.watch('location') || '未知位置'}
            </p>
          </div>

          {/* Additional location (optional) */}
          <UnifiedFormField
            control={form.control}
            name="additionalLocation"
            label=""
            type="text"
            placeholder="如有特殊位置说明，请在此填写（可选）"
          />
        </div>

        {/* Production Interrupted Checkbox - NEW */}
        <div className="space-y-3">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-700">
                <p className="font-semibold mb-1">生产中断判断</p>
                <p>如果设备故障导致生产线停止或严重影响生产进度，请勾选此项。</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="productionInterrupted"
              checked={productionInterrupted}
              onCheckedChange={(checked: boolean) => setProductionInterrupted(checked)}
            />
            <div>
              <Label
                htmlFor="productionInterrupted"
                className="text-sm font-medium cursor-pointer"
              >
                造成生产中断
              </Label>
              <p className="text-xs text-gray-500">勾选此项可选择紧急优先级</p>
            </div>
          </div>
        </div>

        {/* Priority Field with Conditional Urgent Option */}
        <div className="space-y-3">
          <Label className="text-bizlink-700 font-medium">优先级</Label>
          <RadioGroup
            value={form.watch('priority')}
            onValueChange={(value: string) => form.setValue('priority', value as Priority)}
            className="grid grid-cols-2 gap-2"
          >
            {availablePriorities.map(priority => (
              <div key={priority} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted">
                <RadioGroupItem value={priority} id={priority} />
                <Label htmlFor={priority} className="cursor-pointer">
                  {PriorityLabels[priority]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Description Field */}
        <UnifiedFormField
          control={form.control}
          name="description"
          label="详细描述"
          type="textarea"
          placeholder="请详细描述设备问题"
          description="可选项，提供更多问题详情有助于技术员快速解决"
        />

        {/* Photo Upload Field */}
        <div className="space-y-2">
          <Label className="text-bizlink-700 font-medium">故障照片（可选）</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            {...form.register('photos')}
            className="file:border-0 file:bg-transparent file:text-sm file:font-medium"
          />
          {form.watch('photos')?.length && form.watch('photos')!.length > 0 && (
            <div className="space-y-2">
              {Array.from(form.watch('photos') || []).map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                  <span className="text-sm text-muted-foreground">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const files = Array.from(form.watch('photos') || []);
                      files.splice(index, 1);
                      const dataTransfer = new DataTransfer();
                      files.forEach(file => dataTransfer.items.add(file));
                      form.setValue('photos', dataTransfer.files);
                    }}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancel Button */}
        <div className="flex justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            取消
          </Button>
        </div>
      </FormWrapper>
    </div>
  );
}