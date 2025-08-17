'use client';

import React, { useState, useEffect } from 'react';
import { useSettingsManagementStore } from '../../lib/stores/settings-management-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DataTable } from '../interactive/tables/DataTable';
import { ColumnDef } from '../interactive/tables/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ConfirmDialog } from '../interactive/dialogs/ConfirmDialog';
import { Plus, Settings, Search, Edit, Trash2, Eye } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { MasterDataCreateInput, MasterDataUpdateInput, Category, Location, FaultCode, Reason, PriorityLevel, UsageInfo } from '../../lib/services/settings-service';
import { IntegratedCategoriesManagement } from './IntegratedCategoriesManagement';

const MASTER_DATA_TYPES = [
  { key: 'integrated-categories', label: '报修分类', description: '管理报修分类和原因', isIntegrated: true },
  { key: 'fault-codes', label: '故障分析', description: '管理故障分析代码' },
  { key: 'locations', label: '设备位置', description: '管理设备位置信息' },
  // { key: 'priority-levels', label: '优先级', description: '管理优先级等级' }, // 隐藏优先级设置，程序内置
] as const;

type MasterDataType = typeof MASTER_DATA_TYPES[number]['key'];
type MasterDataItem = Category | Location | FaultCode | Reason | PriorityLevel;

export const SettingsManagement: React.FC = () => {
  const {
    categories,
    locations,
    faultCodes,
    reasons,
    priorityLevels,
    categoriesTotal,
    locationsTotal,
    faultCodesTotal,
    reasonsTotal,
    priorityLevelsTotal,
    currentType,
    page,
    limit,
    searchQuery,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    setCurrentType,
    updateSearchQuery,
    fetchCategories,
    fetchLocations,
    fetchFaultCodes,
    fetchReasons,
    fetchPriorityLevels,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryUsage,
    createLocation,
    updateLocation,
    deleteLocation,
    getLocationUsage,
    createFaultCode,
    updateFaultCode,
    deleteFaultCode,
    getFaultCodeUsage,
    createReason,
    updateReason,
    deleteReason,
    getReasonUsage,
    createPriorityLevel,
    updatePriorityLevel,
    deletePriorityLevel,
    getPriorityLevelUsage,
    clearError,
  } = useSettingsManagementStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MasterDataItem | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [formData, setFormData] = useState<MasterDataCreateInput>({ name: '', description: '' });

  // Load data when component mounts or type changes
  useEffect(() => {
    clearError();
    const loadData = async () => {
      switch (currentType) {
        case 'integrated-categories':
          // No need to load data for integrated view, it handles its own data
          break;
        case 'locations':
          await fetchLocations({ page: 1, limit: 20 });
          break;
        case 'fault-codes':
          await fetchFaultCodes({ page: 1, limit: 20 });
          break;
        case 'priority-levels':
          await fetchPriorityLevels({ page: 1, limit: 20 });
          break;
      }
    };
    loadData();
  }, [currentType]);

  // Get current data based on type
  const getCurrentData = (): { items: MasterDataItem[]; total: number } => {
    switch (currentType) {
      case 'integrated-categories':
        return { items: [], total: 0 }; // Handled by IntegratedCategoriesManagement
      case 'locations':
        return { items: locations, total: locationsTotal };
      case 'fault-codes':
        return { items: faultCodes, total: faultCodesTotal };
      case 'priority-levels':
        return { items: priorityLevels, total: priorityLevelsTotal };
      default:
        return { items: [], total: 0 };
    }
  };

  const { items, total } = getCurrentData();

  // Define table columns
  const columns: ColumnDef<MasterDataItem>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: '名称',
      cell: (item: MasterDataItem) => <span className="font-medium">{item.name}</span>,
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: '描述',
      cell: (item: MasterDataItem) => {
        return item.description ? <span className="text-gray-600">{item.description}</span> : <span className="text-gray-400">无描述</span>;
      },
    },
    ...(currentType === 'priority-levels' ? [{
      id: 'level',
      accessorKey: 'level',
      header: '等级',
      cell: (item: MasterDataItem) => <Badge variant="outline">{(item as any).level}</Badge>,
    }] : []),
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: '状态',
      cell: (item: MasterDataItem) => {
        return (
          <Badge variant={item.isActive ? 'default' : 'secondary'}>
            {item.isActive ? '活跃' : '停用'}
          </Badge>
        );
      },
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: '创建时间',
      cell: (item: MasterDataItem) => formatDate(item.createdAt),
    },
    {
      id: 'actions',
      header: '操作',
      cell: (item: MasterDataItem) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewUsage(item)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(item)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Handle actions
  const handleCreate = () => {
    setFormData({ name: '', description: '', ...(currentType === 'priority-levels' && { level: 1 }) });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (item: MasterDataItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      ...(currentType === 'priority-levels' && 'level' in item && { level: item.level })
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (item: MasterDataItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleViewUsage = async (item: MasterDataItem) => {
    setSelectedItem(item);
    try {
      let usage: UsageInfo;
      switch (currentType) {
        case 'categories':
          usage = await getCategoryUsage(item.id);
          break;
        case 'locations':
          usage = await getLocationUsage(item.id);
          break;
        case 'fault-codes':
          usage = await getFaultCodeUsage(item.id);
          break;
        case 'reasons':
          usage = await getReasonUsage(item.id);
          break;
        case 'priority-levels':
          usage = await getPriorityLevelUsage(item.id);
          break;
        default:
          return;
      }
      setUsageInfo(usage);
      setIsUsageDialogOpen(true);
    } catch (error) {
      console.error('Failed to get usage info:', error);
    }
  };

  const handleSubmitCreate = async () => {
    try {
      switch (currentType) {
        case 'categories':
          await createCategory(formData);
          break;
        case 'locations':
          await createLocation(formData);
          break;
        case 'fault-codes':
          await createFaultCode(formData);
          break;
        case 'reasons':
          await createReason(formData);
          break;
        case 'priority-levels':
          await createPriorityLevel(formData);
          break;
      }
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create item:', error);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedItem) return;
    
    try {
      const updateData: MasterDataUpdateInput = {
        name: formData.name,
        description: formData.description,
        ...(currentType === 'priority-levels' && formData.level && { level: formData.level })
      };

      switch (currentType) {
        case 'categories':
          await updateCategory(selectedItem.id, updateData);
          break;
        case 'locations':
          await updateLocation(selectedItem.id, updateData);
          break;
        case 'fault-codes':
          await updateFaultCode(selectedItem.id, updateData);
          break;
        case 'reasons':
          await updateReason(selectedItem.id, updateData);
          break;
        case 'priority-levels':
          await updatePriorityLevel(selectedItem.id, updateData);
          break;
      }
      setIsEditDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;

    try {
      switch (currentType) {
        case 'categories':
          await deleteCategory(selectedItem.id);
          break;
        case 'locations':
          await deleteLocation(selectedItem.id);
          break;
        case 'fault-codes':
          await deleteFaultCode(selectedItem.id);
          break;
        case 'reasons':
          await deleteReason(selectedItem.id);
          break;
        case 'priority-levels':
          await deletePriorityLevel(selectedItem.id);
          break;
      }
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const currentTypeConfig = MASTER_DATA_TYPES.find(t => t.key === currentType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
          <p className="text-muted-foreground">管理系统主数据配置</p>
        </div>
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Master Data Type Selector */}
      <div className="grid grid-cols-3 gap-4">
        {MASTER_DATA_TYPES.map((type) => (
          <Card
            key={type.key}
            className={`cursor-pointer transition-colors ${
              currentType === type.key ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
            onClick={() => setCurrentType(type.key as MasterDataType)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{type.label}</CardTitle>
              <CardDescription className="text-xs">{type.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Current Type Management */}
      {currentType === 'integrated-categories' ? (
        <IntegratedCategoriesManagement />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentTypeConfig?.label}</CardTitle>
                <CardDescription>{currentTypeConfig?.description}</CardDescription>
              </div>
              <Button onClick={handleCreate} disabled={isCreating}>
                <Plus className="mr-2 h-4 w-4" />
                {`添加${currentTypeConfig?.label.slice(0, 2)}`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={`搜索${currentTypeConfig?.label}...`}
                  value={searchQuery}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Data Table */}
            <DataTable
              columns={columns}
              data={items}
              loading={isLoading}
              pagination={{
                page,
                limit,
                total,
                onPageChange: (newPage) => {
                  // Implement pagination logic here
                },
                onLimitChange: (newLimit) => {
                  // Implement limit change logic here
                },
              }}
            />

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentType === 'categories' ? '添加分类' : 
                         currentType === 'reasons' ? '添加原因' : 
                         `添加${currentTypeConfig?.label.slice(0, 2)}`}</DialogTitle>
            <DialogDescription>{currentType === 'categories' ? '创建新的报修分类' : 
                                 currentType === 'reasons' ? '创建新的报修原因' : 
                                 `创建新的${currentTypeConfig?.label}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入名称"
              />
            </div>
            <div>
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入描述（可选）"
              />
            </div>
            {currentType === 'priority-levels' && (
              <div>
                <Label htmlFor="level">等级</Label>
                <Input
                  id="level"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.level || 1}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  placeholder="输入等级 (1-10)"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmitCreate} disabled={isCreating || !formData.name}>
                {isCreating ? '创建中...' : '创建'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentType === 'categories' ? '编辑分类' : 
                         currentType === 'reasons' ? '编辑原因' : 
                         `编辑${currentTypeConfig?.label.slice(0, 2)}`}</DialogTitle>
            <DialogDescription>{currentType === 'categories' ? '修改报修分类信息' : 
                                 currentType === 'reasons' ? '修改报修原因信息' : 
                                 `修改${currentTypeConfig?.label}信息`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入名称"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">描述</Label>
              <Input
                id="edit-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入描述（可选）"
              />
            </div>
            {currentType === 'priority-levels' && (
              <div>
                <Label htmlFor="edit-level">等级</Label>
                <Input
                  id="edit-level"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.level || 1}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  placeholder="输入等级 (1-10)"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmitEdit} disabled={isUpdating || !formData.name}>
                {isUpdating ? '更新中...' : '更新'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>使用情况</DialogTitle>
            <DialogDescription>查看"{selectedItem?.name}"的使用情况</DialogDescription>
          </DialogHeader>
          {usageInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{usageInfo.workOrderCount}</div>
                  <div className="text-sm text-muted-foreground">关联的工单</div>
                </div>
                {usageInfo.assetCount !== undefined && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{usageInfo.assetCount}</div>
                    <div className="text-sm text-muted-foreground">关联的资产</div>
                  </div>
                )}
                {usageInfo.resolutionRecordCount !== undefined && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{usageInfo.resolutionRecordCount}</div>
                    <div className="text-sm text-muted-foreground">解决记录</div>
                  </div>
                )}
                {usageInfo.maintenanceHistoryCount !== undefined && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{usageInfo.maintenanceHistoryCount}</div>
                    <div className="text-sm text-muted-foreground">维护历史</div>
                  </div>
                )}
              </div>
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">删除状态</div>
                <Badge variant={usageInfo.canDelete ? 'default' : 'destructive'}>
                  {usageInfo.canDelete ? '可以删除' : '不能删除'}
                </Badge>
                {!usageInfo.canDelete && (
                  <p className="text-sm text-muted-foreground mt-2">
                    该项目正在被使用，无法删除。请先删除所有相关记录。
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="确认删除"
        description={`确定要删除"${selectedItem?.name}"吗？此操作不可撤销。`}
        onConfirm={handleConfirmDelete}
        confirmText="删除"
        loading={isDeleting}
      />
    </div>
  );
};