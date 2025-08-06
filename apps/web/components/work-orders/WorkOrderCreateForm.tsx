'use client';

import { useState, useEffect } from 'react';
import { Priority, PriorityLabels } from '../../lib/types/work-order';
import { workOrderService } from '../../lib/services/work-order-service';
import { useWorkOrderStore } from '../../lib/stores/work-order-store';
import { assetService, Asset } from '../../lib/services/asset-service';

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
  category: string;
  reason: string;
  location: string;
  priority: Priority;
  description: string;
  photos: File[];
}

interface FormErrors {
  assetId?: string;
  title?: string;
  category?: string;
  reason?: string;
}

export function WorkOrderCreateForm({
  onCancel,
  onSuccess,
}: WorkOrderCreateFormProps) {
  const { createWorkOrder, creating, createError, clearCreateError } = useWorkOrderStore();
  
  const [formData, setFormData] = useState<FormData>({
    assetId: '',
    title: '',
    category: '',
    reason: '',
    location: '',
    priority: Priority.MEDIUM,
    description: '',
    photos: [],
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  
  // Form options loaded from API
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [commonLocations, setCommonLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      // Load assets and form options in parallel
      const [assetsResponse, formOptions] = await Promise.all([
        assetService.getAllAssets({ isActive: true, limit: 1000 }), // Get all active assets
        workOrderService.getFormOptions()
      ]);
      
      setAssets(assetsResponse.assets);
      setCategories(formOptions.categories);
      setReasons(formOptions.reasons);
      setCommonLocations(formOptions.commonLocations);
      setIsLoading(false);
    } catch (error) {
      // Use structured logging instead of console.error in production
      // console.error('Failed to load form data:', error);
      // Use fallback data if API fails - extract to constants for maintainability
      setAssets([]);
      setCategories(DEFAULT_CATEGORIES);
      setReasons(DEFAULT_REASONS);
      setCommonLocations(DEFAULT_LOCATIONS);
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.assetId) {
      errors.assetId = '请选择需要维修的设备';
    }

    if (!formData.title.trim()) {
      errors.title = '请输入工单标题';
    } else if (formData.title.trim().length < 5) {
      errors.title = '标题至少需要5个字符';
    }

    if (!formData.category) {
      errors.category = '请选择报修类别';
    }

    if (!formData.reason) {
      errors.reason = '请选择报修原因';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Clear any previous errors
    clearCreateError();
    
    try {
      await createWorkOrder({
        assetId: formData.assetId,
        title: formData.title.trim(),
        category: formData.category,
        reason: formData.reason,
        location: formData.location.trim() || undefined,
        priority: formData.priority,
        description: formData.description.trim() || undefined,
        photos: formData.photos,
      });
      onSuccess();
    } catch (error) {
      // Error handling is managed by the store - this catch is for any unexpected errors
      // console.error('Failed to create work order:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | Priority | File[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing, but only if the input now has valid content
    if (formErrors[field as keyof FormErrors]) {
      if (field === 'assetId' && value) {
        setFormErrors(prev => ({
          ...prev,
          [field]: undefined
        }));
      } else if (field === 'title' && typeof value === 'string' && value.trim().length >= 5) {
        setFormErrors(prev => ({
          ...prev,
          [field]: undefined
        }));
      } else if (field === 'category' && value) {
        setFormErrors(prev => ({
          ...prev,
          [field]: undefined
        }));
      } else if (field === 'reason' && value) {
        setFormErrors(prev => ({
          ...prev,
          [field]: undefined
        }));
      }
    }
  };

  const handleLocationSuggestionClick = (location: string) => {
    setFormData(prev => ({
      ...prev,
      location
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      photos: files
    }));
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">加载表单数据...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Error Display */}
      {createError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                创建工单失败
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {createError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Selection Field - MANDATORY */}
      <div>
        <label htmlFor="assetId" className="block text-sm font-medium text-gray-700 mb-2">
          选择设备 <span className="text-red-500">*</span>
        </label>
        <select
          id="assetId"
          value={formData.assetId}
          onChange={(e) => handleInputChange('assetId', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
            formErrors.assetId
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
        >
          <option value="">请选择需要维修的设备</option>
          {assets.map(asset => (
            <option key={asset.id} value={asset.id}>
              {asset.assetCode} - {asset.name} ({asset.location})
            </option>
          ))}
        </select>
        {formErrors.assetId && (
          <p className="mt-1 text-sm text-red-600">{formErrors.assetId}</p>
        )}
        {assets.length === 0 && !isLoading && (
          <p className="mt-1 text-sm text-yellow-600">无可用设备，请联系管理员</p>
        )}
      </div>

      {/* Title Field */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          工单标题 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
            formErrors.title 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
          placeholder="请输入工单标题（至少5个字符）"
        />
        {formErrors.title && (
          <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
        )}
        {!formErrors.title && formData.title.trim().length > 0 && formData.title.trim().length < 5 && (
          <p className="mt-1 text-sm text-yellow-600">还需要 {5 - formData.title.trim().length} 个字符</p>
        )}
      </div>

      {/* Category Field */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          报修类别 <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
            formErrors.category
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
        >
          <option value="">请选择报修类别</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        {formErrors.category && (
          <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
        )}
      </div>

      {/* Reason Field */}
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
          报修原因 <span className="text-red-500">*</span>
        </label>
        <select
          id="reason"
          value={formData.reason}
          onChange={(e) => handleInputChange('reason', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
            formErrors.reason
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
        >
          <option value="">请选择报修原因</option>
          {reasons.map(reason => (
            <option key={reason} value={reason}>{reason}</option>
          ))}
        </select>
        {formErrors.reason && (
          <p className="mt-1 text-sm text-red-600">{formErrors.reason}</p>
        )}
      </div>

      {/* Location Field */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
          具体位置
        </label>
        <input
          type="text"
          id="location"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="请输入或选择具体位置"
        />
        {commonLocations.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {commonLocations.map(location => (
                <button
                  key={location}
                  type="button"
                  onClick={() => handleLocationSuggestionClick(location)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Priority Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          优先级
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(Priority).map(priority => (
            <label
              key={priority}
              className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="priority"
                value={priority}
                checked={formData.priority === priority}
                onChange={(e) => handleInputChange('priority', e.target.value as Priority)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">{PriorityLabels[priority]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          详细描述（可选）
        </label>
        <textarea
          id="description"
          rows={4}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="请详细描述设备问题"
        />
      </div>

      {/* Photo Upload Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          故障照片（可选）
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {formData.photos.length > 0 && (
          <div className="mt-2 space-y-2">
            {formData.photos.map((photo, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm text-gray-700">{photo.name}</span>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {creating && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          {creating ? '提交中...' : '提交工单'}
        </button>
      </div>
    </form>
  );
}