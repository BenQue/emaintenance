'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, MapPin, Activity, Settings, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { QRCode } from '../ui/QRCode';
import { QRCodeModal } from '../ui/QRCodeModal';
import { useAuthStore } from '../../lib/stores/auth-store';
import { Asset, PaginatedAssets, AssetStats, assetService } from '../../lib/services/asset-service';

export function AssetManagement() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<PaginatedAssets | null>(null);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 检查是否是管理员
  const isAdmin = user?.role === 'ADMIN';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // QR Code modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadAssets();
  }, [searchQuery, selectedLocation, selectedStatus, currentPage, pageSize]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [statsData, locationsData] = await Promise.all([
        assetService.getAssetStats(),
        assetService.getLocations()
      ]);
      setStats(statsData);
      setLocations(locationsData.locations || []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load asset data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      setError(null);
      const filters = {
        search: searchQuery || undefined,
        location: selectedLocation || undefined,
        isActive: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
        page: currentPage,
        limit: pageSize
      };

      const result = await assetService.getAllAssets(filters);
      setAssets(result);
    } catch (error) {
      console.error('Failed to load assets:', error);
      setError('Failed to load assets');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const handleCreateAsset = () => {
    router.push('/dashboard/assets/create');
  };

  const handleImportAssets = () => {
    router.push('/dashboard/assets/import');
  };

  const handleViewAsset = (assetId: string) => {
    router.push(`/dashboard/assets/${assetId}`);
  };

  const handleEditAsset = (assetId: string) => {
    router.push(`/dashboard/assets/${assetId}/edit`);
  };

  const handleDeleteAsset = async (assetId: string, assetName: string) => {
    if (!confirm(`确定要删除设备 "${assetName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      await assetService.deleteAsset(assetId);
      await loadAssets(); // Reload the assets list
      await loadInitialData(); // Reload stats
    } catch (error) {
      console.error('Failed to delete asset:', error);
      alert('删除设备失败，请重试');
    }
  };

  const handleQRCodeClick = (asset: Asset) => {
    setSelectedAssetForQR(asset);
    setQrModalOpen(true);
  };

  const handleCloseQRModal = () => {
    setQrModalOpen(false);
    setSelectedAssetForQR(null);
  };

  if (isLoading && !assets) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">设备管理</h1>
              <p className="text-muted-foreground">
                管理系统设备资产，包括所有者分配和状态控制
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2" 
                onClick={handleImportAssets}
              >
                📁 批量导入
              </Button>
            )}
            <Button size="sm" className="flex items-center gap-2" onClick={handleCreateAsset}>
              <Plus className="h-4 w-4" />
              添加设备
            </Button>
          </div>
        </div>

        {/* Page Content */}
        <div className="space-y-6">
          {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">总设备数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">活跃设备</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Activity className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">停用设备</p>
                <p className="text-2xl font-bold">{stats.inactive}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <MapPin className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">使用位置</p>
                <p className="text-2xl font-bold">{stats.locations}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索设备名称、编码、位置..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <Select
            value={selectedLocation || 'ALL'}
            onValueChange={(value: string) => handleLocationChange(value === 'ALL' ? '' : value)}
          >
            <SelectTrigger className="w-auto">
              <SelectValue placeholder="所有位置" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">所有位置</SelectItem>
              {(locations || []).map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedStatus || 'ALL'}
            onValueChange={(value: string) => handleStatusChange(value === 'ALL' ? '' : value)}
          >
            <SelectTrigger className="w-auto">
              <SelectValue placeholder="所有状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">所有状态</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="inactive">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Assets List */}
      {error && (
        <Card className="p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadAssets} variant="outline">
            重试
          </Button>
        </Card>
      )}

      {assets && (
        <div className="space-y-4">
          {/* Results Summary */}
          <div className="flex justify-between items-center text-sm text-gray-600">
            <p>
              显示第 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, assets.total)} 条，共 {assets.total} 条设备
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="pageSize">每页显示:</Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value: string) => setPageSize(parseInt(value))}
              >
                <SelectTrigger className="w-auto min-w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(assets.assets || []).map((asset) => (
              <Card key={asset.id} className="p-4 hover:shadow-md transition-shadow relative">
                {/* QR Code in top right corner */}
                <div className="absolute top-3 right-3">
                  <QRCode 
                    value={asset.assetCode} 
                    size={60} 
                    onClick={() => handleQRCodeClick(asset)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </div>

                <div className="flex justify-between items-start mb-3 pr-16">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{asset.name}</h3>
                      <Badge variant={asset.isActive ? 'default' : 'secondary'}>
                        {asset.isActive ? '活跃' : '停用'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      编码: {asset.assetCode}
                    </p>
                    {asset.model && (
                      <p className="text-sm text-gray-600 mb-1">
                        型号: {asset.model}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{asset.location}</span>
                  </div>
                  
                  {asset.manufacturer && (
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>制造商: {asset.manufacturer}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>
                      负责人: {asset.administrator?.firstName || '未分配'} {asset.administrator?.lastName || ''}
                    </span>
                  </div>

                  {asset.installDate && (
                    <div className="text-xs text-gray-500">
                      安装日期: {formatDate(asset.installDate)}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => handleViewAsset(asset.id)}
                  >
                    <Eye className="h-3 w-3" />
                    查看
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => handleEditAsset(asset.id)}
                  >
                    <Edit className="h-3 w-3" />
                    编辑
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteAsset(asset.id, asset.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                    删除
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {assets && assets.totalPages && assets.totalPages > 1 && (
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  上一页
                </Button>
                
                <div className="flex items-center gap-2">
                  {assets && assets.totalPages && [...Array(Math.min(5, assets.totalPages))].map((_, i) => {
                    let pageNum;
                    if (assets.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= assets.totalPages - 2) {
                      pageNum = assets.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    if (pageNum < 1 || pageNum > assets.totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!assets || currentPage >= assets.totalPages}
                >
                  下一页
                </Button>
              </div>
              
              <div className="text-center text-sm text-gray-500 mt-2">
                第 {currentPage} 页，共 {assets && assets.totalPages || 0} 页
              </div>
            </Card>
          )}
        </div>
      )}

      {assets && assets.assets && assets.assets.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">没有找到符合条件的设备</p>
        </Card>
      )}

      {/* Show error if assets structure is invalid */}
      {assets && !assets.assets && (
        <Card className="p-8 text-center">
          <p className="text-red-600">数据格式错误，请刷新页面重试</p>
          <Button onClick={loadAssets} variant="outline" className="mt-4">
            重新加载
          </Button>
        </Card>
      )}

          {/* QR Code Modal */}
          {selectedAssetForQR && (
            <QRCodeModal
              isOpen={qrModalOpen}
              onClose={handleCloseQRModal}
              assetCode={selectedAssetForQR.assetCode}
              assetName={selectedAssetForQR.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}