'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Activity, Settings, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Asset, PaginatedAssets, AssetStats, assetService } from '../../lib/services/asset-service';

export function AssetManagement() {
  const [assets, setAssets] = useState<PaginatedAssets | null>(null);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">设备管理</h1>
          <p className="text-gray-600 mt-2">
            管理系统设备资产，包括所有者分配和状态控制
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          添加设备
        </Button>
      </div>

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
          
          <select
            value={selectedLocation}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">所有位置</option>
            {(locations || []).map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">所有状态</option>
            <option value="active">活跃</option>
            <option value="inactive">停用</option>
          </select>
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
              <label htmlFor="pageSize">每页显示:</label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(assets.assets || []).map((asset) => (
              <Card key={asset.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
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
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    查看
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <Edit className="h-3 w-3" />
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1 text-red-600 hover:text-red-700">
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
    </div>
  );
}