'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Priority, PriorityLabels } from '../../lib/types/work-order';
import { workOrderService } from '../../lib/services/work-order-service';
import { useWorkOrderStore } from '../../lib/stores/work-order-store';
import { assetService, Asset } from '../../lib/services/asset-service';
import { FormWrapper } from '../forms/unified/FormWrapper';
import { UnifiedFormField } from '../forms/unified/FormField';
import { workOrderValidationRules } from '../forms/unified/FormValidation';
import { CascadingCategoryReasonSelector } from '../forms/CascadingCategoryReasonSelector';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

// Constants for fallback data - improves maintainability
const DEFAULT_CATEGORIES = ['设备故障', '预防性维护', '常规检查', '清洁维护'];
const DEFAULT_REASONS = ['机械故障', '电气故障', '软件问题', '磨损老化', '操作错误', '外部因素'];
const DEFAULT_LOCATIONS = ['生产车间A', '生产车间B', '仓库区域', '办公区域', '设备机房'];


interface WorkOrderCreateFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormData {
  assetId: string;
  title: string;
  categoryId: string;
  reasonId: string;
  location: string;
  priority: Priority;
  description: string;
  photos: FileList | null;
}

// To store the names for submission
interface FormDataWithNames extends FormData {
  categoryName?: string;
  reasonName?: string;
}

export function WorkOrderCreateForm({
  onCancel,
  onSuccess,
}: WorkOrderCreateFormProps) {
  const { createWorkOrder, creating, createError, clearCreateError } = useWorkOrderStore();
  
  // React Hook Form setup with validation
  const form = useForm<FormData>({
    defaultValues: {
      assetId: '',
      title: '',
      categoryId: '',
      reasonId: '',
      location: '',
      priority: Priority.MEDIUM,
      description: '',
      photos: null,
    },
    mode: 'onChange', // Enable real-time validation
  });

  // Store category and reason names for submission
  const [categoryName, setCategoryName] = useState<string>('');
  const [reasonName, setReasonName] = useState<string>('');

  // Form options loaded from API
  const [assets, setAssets] = useState<Asset[]>([]);
  const [commonLocations, setCommonLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      // Load assets and form options in parallel
      const [assetsResponse, formOptions] = await Promise.all([
        assetService.getAllAssets({ isActive: true, limit: 100 }), // Get all active assets
        workOrderService.getFormOptions()
      ]);
      
      setAssets(assetsResponse.assets);
      setCommonLocations(formOptions.commonLocations);
      setIsLoading(false);
    } catch (error) {
      // Log the error for debugging
      console.error('Failed to load form data:', error);
      
      // If it's an auth error, redirect to login
      if (error instanceof Error && error.message.includes('401')) {
        window.location.href = '/login';
        return;
      }
      
      // For other errors, still set empty arrays
      setAssets([]);
      setCommonLocations(DEFAULT_LOCATIONS);
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    // Clear any previous errors
    clearCreateError();
    
    try {
      // Convert FileList to File[] for the API
      const photos = data.photos ? Array.from(data.photos) : [];
      
      console.log('[DEBUG] Submitting work order data:', {
        assetId: data.assetId,
        title: data.title.trim(),
        category: categoryName,
        reason: reasonName,
        categoryId: data.categoryId,
        reasonId: data.reasonId,
      });
      
      await createWorkOrder({
        assetId: data.assetId,
        title: data.title.trim(),
        category: categoryName, // Use the name for backwards compatibility
        reason: reasonName, // Use the name for backwards compatibility
        location: data.location.trim() || undefined,
        priority: data.priority,
        description: data.description.trim() || undefined,
        photos,
        // Include IDs for new database relationships
        categoryId: data.categoryId,
        reasonId: data.reasonId,
      });
      
      console.log('[DEBUG] Work order created successfully, calling onSuccess()');
      onSuccess();
    } catch (error) {
      console.error('[DEBUG] Error creating work order:', error);
      // Error handling is managed by the store, but we should re-throw to prevent onSuccess
      throw error;
    }
  };

  const handleLocationSuggestionClick = (location: string) => {
    form.setValue('location', location);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bizlink-500"></div>
        <span className="ml-3 text-muted-foreground">加载表单数据...</span>
      </div>
    );
  }

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
        {/* Device Selection Field - MANDATORY */}
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


        {/* Title Field */}
        <UnifiedFormField
          control={form.control}
          name="title"
          label="工单标题"
          type="text"
          placeholder="请输入工单标题（至少5个字符）"
          description="请简要描述需要维修的问题"
        />

        {/* Category and Reason Selection */}
        <CascadingCategoryReasonSelector
          control={form.control}
          categoryName="categoryId"
          reasonName="reasonId"
          onCategoryChange={(categoryId, categoryName) => {
            setCategoryName(categoryName);
          }}
          onReasonChange={(reasonId, reasonName) => {
            setReasonName(reasonName);
          }}
          disabled={creating}
        />

        {/* Location Field */}
        <div className="space-y-2">
          <UnifiedFormField
            control={form.control}
            name="location"
            label="具体位置"
            type="text"
            placeholder="请输入或选择具体位置"
            description="可以从下方常用位置中选择"
          />
          
          {commonLocations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {commonLocations.map(location => (
                <Button
                  key={location}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleLocationSuggestionClick(location)}
                  className="text-xs"
                >
                  {location}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Priority Field */}
        <div className="space-y-3">
          <Label className="text-bizlink-700 font-medium">优先级</Label>
          <RadioGroup
            value={form.watch('priority')}
            onValueChange={(value: string) => form.setValue('priority', value as Priority)}
            className="grid grid-cols-2 gap-2"
          >
            {Object.values(Priority).map(priority => (
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

        {/* Cancel Button - Added to the form actions */}
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