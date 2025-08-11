'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Asset } from '../../lib/services/asset-service'
import { AssetCodeInput } from './AssetCodeInput'
import { AssetValidationDisplay } from './AssetValidationDisplay'
import { X, Search, QrCode } from 'lucide-react'

interface AssetSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onAssetSelected: (asset: Asset) => void
  onScanQRCode?: () => void
  title?: string
  description?: string
  filters?: {
    location?: string
    isActive?: boolean
    limit?: number
  }
}

export const AssetSearchModal: React.FC<AssetSearchModalProps> = ({
  isOpen,
  onClose,
  onAssetSelected,
  onScanQRCode,
  title = "选择资产",
  description = "输入资产代码或扫描二维码来选择资产",
  filters = { isActive: true, limit: 10 }
}) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  if (!isOpen) return null

  const handleAssetSelection = (asset: Asset) => {
    setSelectedAsset(asset)
  }

  const handleConfirmSelection = () => {
    if (selectedAsset) {
      onAssetSelected(selectedAsset)
      setSelectedAsset(null)
      onClose()
    }
  }

  const handleCancel = () => {
    setSelectedAsset(null)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-2xl mx-4">
        <Card className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription className="mt-1">
                  {description}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* QR Code Scanner Option */}
            {onScanQRCode && (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="font-medium text-gray-900 mb-2">扫描二维码</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    使用摄像头扫描资产上的二维码来快速识别
                  </p>
                  <Button onClick={onScanQRCode} className="w-full max-w-xs">
                    <QrCode className="h-4 w-4 mr-2" />
                    扫描二维码
                  </Button>
                </div>
              </div>
            )}

            {/* Manual Input Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">手工输入资产代码</h3>
              </div>
              
              <div className="space-y-4">
                <AssetCodeInput
                  onAssetSelected={handleAssetSelection}
                  placeholder="输入资产代码进行搜索..."
                  filters={filters}
                  className="w-full"
                />

                {/* Asset validation display */}
                {selectedAsset && (
                  <AssetValidationDisplay
                    asset={selectedAsset}
                    showActions={false}
                  />
                )}
              </div>
            </div>

            {/* Filters Display */}
            {(filters.location || filters.isActive !== undefined) && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">当前筛选条件:</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.location && (
                    <Badge variant="secondary" className="text-xs">
                      位置: {filters.location}
                    </Badge>
                  )}
                  {filters.isActive !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      状态: {filters.isActive ? '活跃' : '非活跃'}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="border-t pt-4">
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCancel}>
                  取消
                </Button>
                <Button 
                  onClick={handleConfirmSelection}
                  disabled={!selectedAsset}
                >
                  确认选择
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}