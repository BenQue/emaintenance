'use client';

import React from 'react';
import { ImportPreview as ImportPreviewData } from '../../lib/services/import-service';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ImportPreviewProps {
  preview: ImportPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting?: boolean;
  type: 'users' | 'assets';
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  preview,
  onConfirm,
  onCancel,
  isImporting = false,
  type,
}) => {
  const typeLabels = {
    users: '用户',
    assets: '设备'
  };

  const canProceed = preview.validation.invalid === 0;

  return (
    <div className="space-y-6">
      {/* 导入摘要 */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {typeLabels[type]}导入预览
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{preview.totalRows}</div>
            <div className="text-sm text-gray-600">总条数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{preview.validation.valid}</div>
            <div className="text-sm text-gray-600">有效条数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{preview.validation.invalid}</div>
            <div className="text-sm text-gray-600">无效条数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{preview.validation.errors.length}</div>
            <div className="text-sm text-gray-600">错误数量</div>
          </div>
        </div>

        {!canProceed && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  发现数据错误
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  请修正CSV文件中的错误后重新上传
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 数据预览 */}
      <Card className="p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">数据预览 (前5条)</h4>
        
        {preview.sampleData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {preview.headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.sampleData.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {preview.headers.map((header, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row[header] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">无数据预览</p>
        )}
      </Card>

      {/* 错误列表 */}
      {preview.validation.errors.length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            数据验证错误 ({preview.validation.errors.length} 个)
          </h4>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {preview.validation.errors.map((error, index) => (
              <div key={index} className="border border-red-200 rounded-md p-3 bg-red-50">
                <div className="flex items-start space-x-3">
                  <Badge className="bg-red-100 text-red-800 shrink-0">
                    第 {error.row} 行
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-900">
                      字段 "{error.field}": {error.error}
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
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isImporting}
        >
          返回
        </Button>
        
        <Button
          onClick={onConfirm}
          disabled={!canProceed || isImporting}
          className={canProceed ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {isImporting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>导入中...</span>
            </div>
          ) : (
            `确认导入 ${preview.validation.valid} 条${typeLabels[type]}数据`
          )}
        </Button>
      </div>
    </div>
  );
};