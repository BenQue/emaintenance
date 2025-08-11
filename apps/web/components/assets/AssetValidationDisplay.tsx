'use client'

import React from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Asset } from '../../lib/services/asset-service'
import { 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  Calendar,
  User,
  Settings,
  ExternalLink
} from 'lucide-react'

interface AssetValidationDisplayProps {
  asset: Asset
  showActions?: boolean
  onViewDetails?: (asset: Asset) => void
  onEdit?: (asset: Asset) => void
  className?: string
}

export const AssetValidationDisplay: React.FC<AssetValidationDisplayProps> = ({
  asset,
  showActions = true,
  onViewDetails,
  onEdit,
  className = ""
}) => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '未知'
    try {
      return new Date(dateString).toLocaleDateString('zh-CN')
    } catch {
      return '无效日期'
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? "bg-green-100 text-green-800 border-green-200" 
      : "bg-gray-100 text-gray-600 border-gray-200"
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive 
      ? <CheckCircle className="h-4 w-4 text-green-600" />
      : <AlertCircle className="h-4 w-4 text-gray-500" />
  }

  return (
    <Card className={`border-green-200 bg-green-50/50 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with Asset Code and Status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(asset.isActive)}
              <div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="font-mono text-sm font-semibold"
                  >
                    {asset.assetCode}
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getStatusColor(asset.isActive)}`}
                  >
                    {asset.isActive ? '活跃' : '非活跃'}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mt-1">
                  {asset.name}
                </h3>
              </div>
            </div>
          </div>

          {/* Asset Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Location */}
            {asset.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">位置:</span>
                <span className="font-medium">{asset.location}</span>
              </div>
            )}

            {/* Install Date */}
            {asset.installDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">安装日期:</span>
                <span className="font-medium">{formatDate(asset.installDate)}</span>
              </div>
            )}

            {/* Owner */}
            {asset.owner && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">负责人:</span>
                <span className="font-medium">
                  {asset.owner.firstName} {asset.owner.lastName}
                </span>
              </div>
            )}

            {/* Administrator */}
            {asset.administrator && (
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">管理员:</span>
                <span className="font-medium">
                  {asset.administrator.firstName} {asset.administrator.lastName}
                </span>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="space-y-2">
            {asset.description && (
              <div>
                <span className="text-sm text-gray-600">描述:</span>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {asset.description}
                </p>
              </div>
            )}

            {/* Technical Details */}
            {(asset.model || asset.manufacturer || asset.serialNumber) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-2 border-t border-gray-200">
                {asset.manufacturer && (
                  <div>
                    <span className="text-gray-600">制造商:</span>
                    <p className="font-medium">{asset.manufacturer}</p>
                  </div>
                )}
                {asset.model && (
                  <div>
                    <span className="text-gray-600">型号:</span>
                    <p className="font-medium">{asset.model}</p>
                  </div>
                )}
                {asset.serialNumber && (
                  <div>
                    <span className="text-gray-600">序列号:</span>
                    <p className="font-medium font-mono text-xs">
                      {asset.serialNumber}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
            <div className="flex justify-between">
              <span>创建于: {formatDate(asset.createdAt)}</span>
              <span>更新于: {formatDate(asset.updatedAt)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(asset)}
                  className="text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  查看详情
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(asset)}
                  className="text-xs"
                >
                  编辑
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}