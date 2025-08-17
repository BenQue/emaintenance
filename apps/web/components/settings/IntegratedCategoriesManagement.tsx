'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ColumnDef } from '../interactive/tables/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { ConfirmDialog } from '../interactive/dialogs/ConfirmDialog';
import { Plus, Edit, Trash2, Eye, ArrowRight, ChevronRight } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { 
  SettingsService, 
  Category, 
  Reason, 
  MasterDataCreateInput, 
  MasterDataUpdateInput, 
  UsageInfo 
} from '../../lib/services/settings-service';

export const IntegratedCategoriesManagement: React.FC = () => {
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryReasons, setCategoryReasons] = useState<Reason[]>([]);
  const [categoriesTotal, setCategoriesTotal] = useState(0);
  const [reasonsTotal, setReasonsTotal] = useState(0);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isEditReasonDialogOpen, setIsEditReasonDialogOpen] = useState(false);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Selected items
  const [selectedReason, setSelectedReason] = useState<Reason | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  
  // Form data
  const [categoryFormData, setCategoryFormData] = useState<MasterDataCreateInput>({ name: '', description: '' });
  const [reasonFormData, setReasonFormData] = useState<MasterDataCreateInput>({ name: '', description: '' });
  
  // Search
  const [categorySearch, setCategorySearch] = useState('');
  const [reasonSearch, setReasonSearch] = useState('');
  
  // Error
  const [error, setError] = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load reasons when category is selected
  useEffect(() => {
    if (selectedCategory) {
      loadReasonsForCategory(selectedCategory.id);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await SettingsService.getCategoriesWithReasons({
        page: 1,
        limit: 50,
        search: categorySearch || undefined,
        isActive: true
      });
      setCategories(response.items);
      setCategoriesTotal(response.total);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReasonsForCategory = async (categoryId: string) => {
    if (!categoryId) return;
    
    setIsLoading(true);
    try {
      const response = await SettingsService.getReasonsByCategory(categoryId, {
        page: 1,
        limit: 50,
        search: reasonSearch || undefined,
        isActive: true
      });
      setCategoryReasons(response.items);
      setReasonsTotal(response.total);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load reasons');
    } finally {
      setIsLoading(false);
    }
  };

  // Category columns
  const categoryColumns: ColumnDef<Category>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: '分类名称',
      cell: (category) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{category.name}</span>
          {category.reasons && category.reasons.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {category.reasons.length} 原因
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: '描述',
      cell: (category) => {
        return category.description ? (
          <span className="text-gray-600">{category.description}</span>
        ) : (
          <span className="text-gray-400">无描述</span>
        );
      },
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: '状态',
      cell: (category) => {
        return (
          <Badge variant={category.isActive ? 'default' : 'secondary'}>
            {category.isActive ? '活跃' : '停用'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: (category) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewCategoryUsage(category)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditCategory(category)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteCategory(category)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Reason columns
  const reasonColumns: ColumnDef<Reason>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: '原因名称',
      cell: (reason) => <span className="font-medium">{reason.name}</span>,
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: '描述',
      cell: (reason) => {
        return reason.description ? (
          <span className="text-gray-600">{reason.description}</span>
        ) : (
          <span className="text-gray-400">无描述</span>
        );
      },
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: '状态',
      cell: (reason) => {
        return (
          <Badge variant={reason.isActive ? 'default' : 'secondary'}>
            {reason.isActive ? '活跃' : '停用'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: (reason) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewReasonUsage(reason)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditReason(reason)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteReason(reason)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Handlers
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setCategoryReasons([]);
  };

  const handleCreateCategory = () => {
    setCategoryFormData({ name: '', description: '' });
    setIsCategoryDialogOpen(true);
  };

  const handleCreateReason = () => {
    if (!selectedCategory) return;
    setReasonFormData({ name: '', description: '' });
    setIsReasonDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setSelectedReason(null); // Clear any selected reason
    setCategoryFormData({
      name: category.name,
      description: category.description || ''
    });
    setIsEditCategoryDialogOpen(true);
  };

  const handleEditReason = (reason: Reason) => {
    setSelectedReason(reason);
    // Note: Don't clear selectedCategory as we need it for context
    setReasonFormData({
      name: reason.name,
      description: reason.description || ''
    });
    setIsEditReasonDialogOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category);
    setSelectedReason(null); // Clear any selected reason
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteReason = (reason: Reason) => {
    setSelectedReason(reason);
    // Note: Don't clear selectedCategory as we need it for context
    setIsDeleteDialogOpen(true);
  };

  const handleViewCategoryUsage = async (category: Category) => {
    try {
      const usage = await SettingsService.getCategoryUsage(category.id);
      setUsageInfo(usage);
      setIsUsageDialogOpen(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to get category usage');
    }
  };

  const handleViewReasonUsage = async (reason: Reason) => {
    try {
      const usage = await SettingsService.getReasonUsage(reason.id);
      setUsageInfo(usage);
      setIsUsageDialogOpen(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to get reason usage');
    }
  };

  const handleSubmitCreateCategory = async () => {
    setIsCreating(true);
    try {
      await SettingsService.createCategory(categoryFormData);
      setIsCategoryDialogOpen(false);
      setCategoryFormData({ name: '', description: '' }); // Reset form data
      await loadCategories();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmitCreateReason = async () => {
    if (!selectedCategory) return;
    
    setIsCreating(true);
    try {
      await SettingsService.createReasonForCategory(selectedCategory.id, reasonFormData);
      setIsReasonDialogOpen(false);
      setReasonFormData({ name: '', description: '' }); // Reset form data
      await loadReasonsForCategory(selectedCategory.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create reason');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmitEditCategory = async () => {
    if (!selectedCategory) return;
    
    setIsUpdating(true);
    try {
      await SettingsService.updateCategory(selectedCategory.id, categoryFormData);
      setIsEditCategoryDialogOpen(false);
      setCategoryFormData({ name: '', description: '' }); // Reset form data
      await loadCategories();
      setSelectedCategory(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitEditReason = async () => {
    if (!selectedReason) return;
    
    setIsUpdating(true);
    try {
      await SettingsService.updateReason(selectedReason.id, reasonFormData);
      setIsEditReasonDialogOpen(false);
      setReasonFormData({ name: '', description: '' }); // Reset form data
      if (selectedCategory) {
        await loadReasonsForCategory(selectedCategory.id);
      }
      setSelectedReason(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update reason');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (selectedCategory && !selectedReason) {
        // Deleting category
        await SettingsService.deleteCategory(selectedCategory.id);
        await loadCategories();
        setSelectedCategory(null);
        setCategoryReasons([]);
      } else if (selectedReason) {
        // Deleting reason
        await SettingsService.deleteReason(selectedReason.id);
        if (selectedCategory) {
          await loadReasonsForCategory(selectedCategory.id);
        }
        setSelectedReason(null);
      }
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">报修分类管理</h2>
          <p className="text-muted-foreground">管理报修分类和对应的原因</p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>报修分类</CardTitle>
                <CardDescription>选择一个分类查看其对应的原因</CardDescription>
              </div>
              <Button onClick={handleCreateCategory} disabled={isCreating}>
                <Plus className="mr-2 h-4 w-4" />
                添加分类
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Category Search */}
            <div className="mb-4">
              <Input
                placeholder="搜索分类..."
                value={categorySearch}
                onChange={(e) => {
                  setCategorySearch(e.target.value);
                  // Debounce search in real implementation
                }}
                className="w-full"
              />
            </div>

            {/* Categories List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCategory?.id === category.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-sm text-muted-foreground">
                          {category.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {category.reasons && category.reasons.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {category.reasons.length}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCategory(category);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Reasons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedCategory ? (
                    <>
                      <span>{selectedCategory.name}</span>
                      <ArrowRight className="h-4 w-4" />
                      <span>原因列表</span>
                    </>
                  ) : (
                    '选择分类查看原因'
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedCategory ? '管理该分类下的报修原因' : '请先选择一个分类'}
                </CardDescription>
              </div>
              {selectedCategory && (
                <Button onClick={handleCreateReason} disabled={isCreating}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加原因
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedCategory ? (
              <>
                {/* Reason Search */}
                <div className="mb-4">
                  <Input
                    placeholder="搜索原因..."
                    value={reasonSearch}
                    onChange={(e) => {
                      setReasonSearch(e.target.value);
                      // Debounce search in real implementation
                    }}
                    className="w-full"
                  />
                </div>

                {/* Reasons Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {reasonColumns.map((column) => (
                          <TableHead key={column.id}>
                            {column.header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={reasonColumns.length} className="h-24 text-center text-muted-foreground">
                            加载中...
                          </TableCell>
                        </TableRow>
                      ) : categoryReasons.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={reasonColumns.length} className="h-24 text-center text-muted-foreground">
                            该分类下暂无原因
                          </TableCell>
                        </TableRow>
                      ) : (
                        categoryReasons.map((reason) => (
                          <TableRow key={reason.id}>
                            {reasonColumns.map((column) => (
                              <TableCell key={column.id}>
                                {column.cell(reason)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                请选择左侧的分类来查看对应的原因
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Create Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分类</DialogTitle>
            <DialogDescription>创建新的报修分类</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">名称</Label>
              <Input
                id="category-name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="输入分类名称"
              />
            </div>
            <div>
              <Label htmlFor="category-description">描述</Label>
              <Input
                id="category-description"
                value={categoryFormData.description || ''}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="输入描述（可选）"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmitCreateCategory}
                disabled={isCreating || !categoryFormData.name}
              >
                {isCreating ? '创建中...' : '创建'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Reason Dialog */}
      <Dialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加原因</DialogTitle>
            <DialogDescription>
              为"{selectedCategory?.name}"分类添加新的报修原因
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason-name">名称</Label>
              <Input
                id="reason-name"
                value={reasonFormData.name}
                onChange={(e) => setReasonFormData({ ...reasonFormData, name: e.target.value })}
                placeholder="输入原因名称"
              />
            </div>
            <div>
              <Label htmlFor="reason-description">描述</Label>
              <Input
                id="reason-description"
                value={reasonFormData.description || ''}
                onChange={(e) => setReasonFormData({ ...reasonFormData, description: e.target.value })}
                placeholder="输入描述（可选）"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsReasonDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmitCreateReason}
                disabled={isCreating || !reasonFormData.name}
              >
                {isCreating ? '创建中...' : '创建'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
            <DialogDescription>修改报修分类信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-category-name">名称</Label>
              <Input
                id="edit-category-name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="输入分类名称"
              />
            </div>
            <div>
              <Label htmlFor="edit-category-description">描述</Label>
              <Input
                id="edit-category-description"
                value={categoryFormData.description || ''}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="输入描述（可选）"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmitEditCategory}
                disabled={isUpdating || !categoryFormData.name}
              >
                {isUpdating ? '更新中...' : '更新'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Reason Dialog */}
      <Dialog open={isEditReasonDialogOpen} onOpenChange={setIsEditReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑原因</DialogTitle>
            <DialogDescription>修改报修原因信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-reason-name">名称</Label>
              <Input
                id="edit-reason-name"
                value={reasonFormData.name}
                onChange={(e) => setReasonFormData({ ...reasonFormData, name: e.target.value })}
                placeholder="输入原因名称"
              />
            </div>
            <div>
              <Label htmlFor="edit-reason-description">描述</Label>
              <Input
                id="edit-reason-description"
                value={reasonFormData.description || ''}
                onChange={(e) => setReasonFormData({ ...reasonFormData, description: e.target.value })}
                placeholder="输入描述（可选）"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditReasonDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmitEditReason}
                disabled={isUpdating || !reasonFormData.name}
              >
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
            <DialogDescription>查看使用情况详情</DialogDescription>
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
        description={
          selectedReason
            ? `确定要删除原因"${selectedReason.name}"吗？此操作不可撤销。`
            : `确定要删除分类"${selectedCategory?.name}"吗？此操作不可撤销。`
        }
        onConfirm={handleConfirmDelete}
        confirmText="删除"
        loading={isDeleting}
      />
    </div>
  );
};