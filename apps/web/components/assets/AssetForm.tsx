'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, AlertCircle } from 'lucide-react';
import { FormWrapper } from '../forms/unified/FormWrapper';
import { UnifiedFormField } from '../forms/unified/FormField';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Asset, assetService } from '../../lib/services/asset-service';
import { User, userService } from '../../lib/services/user-service';
import { formToast } from '../../lib/utils/toast';

interface AssetFormProps {
  asset?: Asset;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSuccess: (asset: Asset) => void;
}

interface AssetFormData {
  assetCode: string;
  name: string;
  description: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  location: string;
  ownerId: string;
  administratorId: string;
  installDate: Date | undefined;
  isActive: boolean;
}

export function AssetForm({ asset, mode, onCancel, onSuccess }: AssetFormProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // React Hook Form setup
  const form = useForm<AssetFormData>({
    defaultValues: {
      assetCode: asset?.assetCode || '',
      name: asset?.name || '',
      description: asset?.description || '',
      model: asset?.model || '',
      manufacturer: asset?.manufacturer || '',
      serialNumber: asset?.serialNumber || '',
      location: asset?.location || '',
      ownerId: asset?.ownerId || '',
      administratorId: asset?.administratorId || '',
      installDate: asset?.installDate ? new Date(asset.installDate) : undefined,
      isActive: asset?.isActive ?? true,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userService.getUsers({ limit: 100 });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const onFormSubmit = async (data: AssetFormData) => {
    setSubmitError(null);

    try {
      const submitData = {
        assetCode: data.assetCode.trim(),
        name: data.name.trim(),
        description: data.description.trim(),
        model: data.model.trim(),
        manufacturer: data.manufacturer.trim(),
        serialNumber: data.serialNumber.trim(),
        location: data.location.trim(),
        installDate: data.installDate ? data.installDate.toISOString() : undefined,
        ownerId: data.ownerId && data.ownerId.trim() !== '' ? data.ownerId : undefined,
        administratorId: data.administratorId && data.administratorId.trim() !== '' ? data.administratorId : undefined,
        isActive: data.isActive,
      };

      let result: Asset;
      if (mode === 'create') {
        result = await assetService.createAsset(submitData);
        formToast.saveSuccess('设备');
      } else {
        result = await assetService.updateAsset(asset!.id, submitData);
        formToast.updateSuccess('设备');
      }

      onSuccess(result);
    } catch (error) {
      console.error('Failed to save asset:', error);
      const errorMessage = error instanceof Error ? error.message : '保存失败';
      setSubmitError(errorMessage);
      
      if (mode === 'create') {
        formToast.saveError('设备', errorMessage);
      } else {
        formToast.updateError('设备', errorMessage);
      }
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl text-bizlink-700">
            {mode === 'create' ? '添加设备' : '编辑设备'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {submitError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <FormWrapper
          form={form}
          onSubmit={onFormSubmit}
          submitButtonText="保存设备"
          onCancel={onCancel}
          loading={form.formState.isSubmitting}
          className="space-y-8"
        >
          {/* Basic Information Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-bizlink-700 border-b border-border pb-2">
              基本信息
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UnifiedFormField
                control={form.control}
                name="assetCode"
                label="设备编码"
                type="text"
                placeholder="输入设备编码"
                description="设备的唯一标识码，用于QR码生成"
                rules={{ 
                  required: '设备编码不能为空',
                  minLength: { value: 3, message: '设备编码至少需要3个字符' }
                }}
                disabled={mode === 'edit'}
              />

              <UnifiedFormField
                control={form.control}
                name="name"
                label="设备名称"
                type="text"
                placeholder="输入设备名称"
                description="设备的显示名称"
                rules={{ 
                  required: '设备名称不能为空',
                  minLength: { value: 2, message: '设备名称至少需要2个字符' }
                }}
              />
            </div>

            <UnifiedFormField
              control={form.control}
              name="description"
              label="设备描述"
              type="textarea"
              placeholder="输入设备详细描述..."
              description="详细描述设备的功能、用途和特点"
              className="min-h-[100px]"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UnifiedFormField
                control={form.control}
                name="model"
                label="设备型号"
                type="text"
                placeholder="输入设备型号"
                description="设备的具体型号"
              />

              <UnifiedFormField
                control={form.control}
                name="manufacturer"
                label="制造商"
                type="text"
                placeholder="输入制造商名称"
                description="设备的制造厂商"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UnifiedFormField
                control={form.control}
                name="serialNumber"
                label="序列号"
                type="text"
                placeholder="输入设备序列号"
                description="设备的出厂序列号"
              />

              <UnifiedFormField
                control={form.control}
                name="location"
                label="设备位置"
                type="text"
                placeholder="输入设备所在位置"
                description="设备的物理位置或安装地点"
                rules={{ 
                  required: '设备位置不能为空',
                  minLength: { value: 2, message: '位置描述至少需要2个字符' }
                }}
              />
            </div>
          </div>

          {/* Management Information Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-bizlink-700 border-b border-border pb-2">
              管理信息
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UnifiedFormField
                control={form.control}
                name="ownerId"
                label="设备所有者"
                type="select"
                placeholder="选择设备所有者"
                description="负责该设备的所有者"
                options={users.map((user) => ({
                  value: user.id,
                  label: `${user.firstName} ${user.lastName} (${user.username})`
                }))}
              />

              <UnifiedFormField
                control={form.control}
                name="administratorId"
                label="设备管理员"
                type="select"
                placeholder="选择设备管理员"
                description="负责维护该设备的管理员"
                options={users.map((user) => ({
                  value: user.id,
                  label: `${user.firstName} ${user.lastName} (${user.username})`
                }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UnifiedFormField
                control={form.control}
                name="installDate"
                label="安装日期"
                type="date"
                placeholder="选择安装日期"
                description="设备的安装或投入使用日期"
              />

              <div className="flex items-center space-x-3 pt-8">
                <input
                  id="isActive"
                  type="checkbox"
                  {...form.register('isActive')}
                  className="h-4 w-4 text-bizlink-600 focus:ring-bizlink-500 border-gray-300 rounded"
                />
                <Label htmlFor="isActive" className="text-sm font-medium text-foreground">
                  设备活跃状态
                </Label>
              </div>
            </div>
          </div>

        </FormWrapper>
      </CardContent>
    </Card>
  );
}