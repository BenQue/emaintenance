'use client';

import React from 'react';
import { ImportResult as ImportResultData } from '../../lib/services/import-service';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ImportResultProps {
  result: ImportResultData;
  onClose: () => void;
  onViewList?: () => void;
  type: 'users' | 'assets';
}

export const ImportResult: React.FC<ImportResultProps> = ({
  result,
  onClose,
  onViewList,
  type,
}) => {
  const typeLabels = {
    users: '用户',
    assets: '设备'
  };

  const successRate = result.total > 0 ? (result.successful / result.total * 100).toFixed(1) : '0';
  const isFullSuccess = result.failed === 0;

  return (
    <div className="space-y-6">
      {/* 导入结果摘要 */}
      <Card className="p-6">
        <div className="text-center mb-6">
          {isFullSuccess ? (
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-yellow-100 p-3">
                <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          )}
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {typeLabels[type]}导入{isFullSuccess ? '完成' : '部分完成'}
          </h3>
          
          <p className="text-gray-600">
            {isFullSuccess 
              ? `成功导入了所有 ${result.successful} 条${typeLabels[type]}数据` 
              : `共处理 ${result.total} 条数据，成功 ${result.successful} 条，失败 ${result.failed} 条`
            }
          </p>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{result.total}</div>
            <div className="text-sm text-gray-600">总处理数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{result.successful}</div>
            <div className="text-sm text-gray-600">成功导入</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{result.failed}</div>
            <div className="text-sm text-gray-600">导入失败</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{successRate}%</div>
            <div className="text-sm text-gray-600">成功率</div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className={`h-2 rounded-full ${isFullSuccess ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{ width: `${successRate}%` }}
          ></div>
        </div>
      </Card>

      {/* 成功导入的数据预览 */}
      {result.imported.length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            成功导入的{typeLabels[type]} (显示前5条)
          </h4>
          
          <div className="space-y-2">
            {result.imported.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {type === 'users' ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.firstName} {item.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.email} • {item.username} • {item.role}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.name || item['资产名称']}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.assetCode || item['资产编码']} • {item.location || item['位置']}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {result.imported.length > 5 && (
              <p className="text-center text-sm text-gray-500 py-2">
                还有 {result.imported.length - 5} 条{typeLabels[type]}数据已成功导入
              </p>
            )}
          </div>
        </Card>
      )}

      {/* 错误信息 */}
      {result.errors.length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            导入错误 ({result.errors.length} 个)
          </h4>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {result.errors.map((error, index) => (
              <div key={index} className="border border-red-200 rounded-md p-3 bg-red-50">
                <div className="flex items-start space-x-3">
                  <Badge className="bg-red-100 text-red-800 shrink-0">
                    第 {error.row} 行
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-900">
                      {error.error}
                    </p>
                    <div className="mt-2 text-xs text-red-700 bg-red-100 rounded p-2">
                      <strong>数据:</strong> {JSON.stringify(error.data, null, 2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div>
          {result.errors.length > 0 && (
            <p className="text-sm text-gray-600">
              建议下载错误日志，修正数据后重新导入失败的记录
            </p>
          )}
        </div>
        
        <div className="flex space-x-3">
          {onViewList && result.successful > 0 && (
            <Button
              variant="outline"
              onClick={onViewList}
              className="text-blue-600 hover:text-blue-700"
            >
              查看{typeLabels[type]}列表
            </Button>
          )}
          
          <Button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700"
          >
            完成
          </Button>
        </div>
      </div>
    </div>
  );
};