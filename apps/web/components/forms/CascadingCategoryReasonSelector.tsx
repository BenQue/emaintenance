'use client';

import React, { useState, useEffect } from 'react';
import { Control, useController } from 'react-hook-form';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SettingsService, Category, Reason } from '../../lib/services/settings-service';

interface CascadingCategoryReasonSelectorProps {
  control: Control<any>;
  categoryName: string;
  reasonName: string;
  onCategoryChange?: (categoryId: string, categoryName: string) => void;
  onReasonChange?: (reasonId: string, reasonName: string) => void;
  disabled?: boolean;
}

export function CascadingCategoryReasonSelector({
  control,
  categoryName,
  reasonName,
  onCategoryChange,
  onReasonChange,
  disabled = false,
}: CascadingCategoryReasonSelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableReasons, setAvailableReasons] = useState<Reason[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingReasons, setIsLoadingReasons] = useState(false);
  
  const {
    field: categoryField,
    fieldState: categoryFieldState
  } = useController({
    control,
    name: categoryName,
  });

  const {
    field: reasonField,
    fieldState: reasonFieldState
  } = useController({
    control,
    name: reasonName,
  });

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load reasons when category changes
  useEffect(() => {
    if (categoryField.value) {
      loadReasonsForCategory(categoryField.value);
    } else {
      setAvailableReasons([]);
      reasonField.onChange(''); // Clear reason when category is cleared
    }
  }, [categoryField.value]);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const response = await SettingsService.getCategoriesWithReasons({
        isActive: true,
        limit: 100
      });
      setCategories(response.items);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadReasonsForCategory = async (categoryId: string) => {
    if (!categoryId) {
      setAvailableReasons([]);
      return;
    }

    setIsLoadingReasons(true);
    try {
      const response = await SettingsService.getReasonsByCategory(categoryId, {
        isActive: true,
        limit: 100
      });
      setAvailableReasons(response.items);
      
      // If the current reason is not available for the new category, clear it
      if (reasonField.value && !response.items.find(r => r.id === reasonField.value)) {
        reasonField.onChange('');
      }
    } catch (error) {
      console.error('Failed to load reasons for category:', error);
      setAvailableReasons([]);
    } finally {
      setIsLoadingReasons(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = categories.find(c => c.id === categoryId);
    categoryField.onChange(categoryId);
    
    if (selectedCategory && onCategoryChange) {
      onCategoryChange(categoryId, selectedCategory.name);
    }
    
    // Clear reason when category changes
    reasonField.onChange('');
  };

  const handleReasonChange = (reasonId: string) => {
    const selectedReason = availableReasons.find(r => r.id === reasonId);
    reasonField.onChange(reasonId);
    
    if (selectedReason && onReasonChange) {
      onReasonChange(reasonId, selectedReason.name);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          报修分类 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={categoryField.value || ''}
          onValueChange={handleCategoryChange}
          disabled={disabled || isLoadingCategories}
        >
          <SelectTrigger className={categoryFieldState.error ? 'border-red-500' : ''}>
            <SelectValue placeholder={isLoadingCategories ? '加载分类中...' : '请选择报修分类'} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{category.name}</span>
                  {category.reasons && category.reasons.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({category.reasons.length}个原因)
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categoryFieldState.error && (
          <p className="text-sm text-red-500">{categoryFieldState.error.message}</p>
        )}
      </div>

      {/* Reason Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          报修原因 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={reasonField.value || ''}
          onValueChange={handleReasonChange}
          disabled={disabled || isLoadingReasons || !categoryField.value || availableReasons.length === 0}
        >
          <SelectTrigger className={reasonFieldState.error ? 'border-red-500' : ''}>
            <SelectValue 
              placeholder={
                !categoryField.value 
                  ? '请先选择报修分类'
                  : isLoadingReasons 
                    ? '加载原因中...'
                    : availableReasons.length === 0
                      ? '该分类暂无可用原因'
                      : '请选择报修原因'
              } 
            />
          </SelectTrigger>
          <SelectContent>
            {availableReasons.map((reason) => (
              <SelectItem key={reason.id} value={reason.id}>
                <div>
                  <div className="font-medium">{reason.name}</div>
                  {reason.description && (
                    <div className="text-xs text-muted-foreground">{reason.description}</div>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {reasonFieldState.error && (
          <p className="text-sm text-red-500">{reasonFieldState.error.message}</p>
        )}
        
        {/* Helper text */}
        {categoryField.value && availableReasons.length > 0 && (
          <p className="text-xs text-muted-foreground">
            找到 {availableReasons.length} 个相关原因
          </p>
        )}
      </div>
    </div>
  );
}