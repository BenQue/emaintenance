'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CSVUploader } from '../../../../components/import/CSVUploader';
import { ImportPreview } from '../../../../components/import/ImportPreview';
import { ImportResult } from '../../../../components/import/ImportResult';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { importService } from '../../../../lib/services/import-service';
import type { ImportPreview as ImportPreviewData, ImportResult as ImportResultData } from '../../../../lib/services/import-service';

type ImportStep = 'upload' | 'preview' | 'result';

export default function AssetImportPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [result, setResult] = useState<ImportResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError('');
    setIsLoading(true);

    try {
      const previewData = await importService.previewAssetCSV(file);
      setPreview(previewData);
      setCurrentStep('preview');
    } catch (error) {
      setError(error instanceof Error ? error.message : '预览失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setCurrentStep('upload');
    setError('');
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const importResult = await importService.importAssets(selectedFile);
      setResult(importResult);
      setCurrentStep('result');
    } catch (error) {
      setError(error instanceof Error ? error.message : '导入失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (currentStep === 'preview') {
      setCurrentStep('upload');
      setPreview(null);
    } else {
      router.push('/dashboard/assets');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await importService.downloadAssetTemplate();
      importService.createDownloadLink(blob, 'asset_template.csv');
    } catch (error) {
      setError('下载模板失败');
    }
  };

  const handleViewAssetList = () => {
    router.push('/dashboard/assets');
  };

  const handleClose = () => {
    router.push('/dashboard/assets');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题和导航 */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <span 
            className="hover:text-blue-600 cursor-pointer"
            onClick={() => router.push('/dashboard')}
          >
            工作台
          </span>
          <span>/</span>
          <span 
            className="hover:text-blue-600 cursor-pointer"
            onClick={() => router.push('/dashboard/assets')}
          >
            设备管理
          </span>
          <span>/</span>
          <span>批量导入</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">批量导入设备</h1>
            <p className="mt-2 text-gray-600">
              通过上传CSV文件批量录入设备资产信息
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="text-blue-600 hover:text-blue-700"
          >
            下载CSV模板
          </Button>
        </div>
      </div>

      {/* 进度指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-8">
          <div className={`flex items-center space-x-2 ${
            currentStep === 'upload' ? 'text-blue-600' : 
            ['preview', 'result'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'upload' ? 'bg-blue-100 border-2 border-blue-600' :
              ['preview', 'result'].includes(currentStep) ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'
            }`}>
              {['preview', 'result'].includes(currentStep) ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm font-medium">1</span>
              )}
            </div>
            <span className="text-sm font-medium">上传文件</span>
          </div>

          <div className={`w-12 h-0.5 ${
            ['preview', 'result'].includes(currentStep) ? 'bg-green-600' : 'bg-gray-300'
          }`}></div>

          <div className={`flex items-center space-x-2 ${
            currentStep === 'preview' ? 'text-blue-600' : 
            currentStep === 'result' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'preview' ? 'bg-blue-100 border-2 border-blue-600' :
              currentStep === 'result' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'
            }`}>
              {currentStep === 'result' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm font-medium">2</span>
              )}
            </div>
            <span className="text-sm font-medium">预览确认</span>
          </div>

          <div className={`w-12 h-0.5 ${
            currentStep === 'result' ? 'bg-green-600' : 'bg-gray-300'
          }`}></div>

          <div className={`flex items-center space-x-2 ${
            currentStep === 'result' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'result' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'
            }`}>
              {currentStep === 'result' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm font-medium">3</span>
              )}
            </div>
            <span className="text-sm font-medium">导入完成</span>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-4xl mx-auto">
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <CSVUploader
              onFileSelect={handleFileSelect}
              onClear={handleClearFile}
              selectedFile={selectedFile}
              isLoading={isLoading}
              error={error}
            />
            
            {/* 使用说明 */}
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">使用说明</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">1.</span>
                  <span>点击"下载CSV模板"获取标准10字段格式的模板文件（包含2行示例数据）</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">2.</span>
                  <div>
                    <div className="mb-1">按照模板格式填写设备信息，标准字段说明：</div>
                    <ul className="ml-4 space-y-1 text-xs">
                      <li><strong>assetCode*</strong>: 资产编码（必填，唯一）</li>
                      <li><strong>name*</strong>: 资产名称（必填）</li>
                      <li><strong>category</strong>: 类别（可选：MECHANICAL/ELECTRICAL/SOFTWARE/OTHER）</li>
                      <li><strong>location*</strong>: 位置（必填，必须在系统中存在）</li>
                      <li><strong>status</strong>: 状态（可选：ACTIVE/INACTIVE，默认ACTIVE）</li>
                      <li><strong>installDate</strong>: 安装日期（可选：YYYY-MM-DD）</li>
                      <li><strong>model</strong>: 设备型号（可选）</li>
                      <li><strong>manufacturer</strong>: 制造商（可选）</li>
                      <li><strong>serialNumber</strong>: 序列号（可选）</li>
                      <li><strong>description</strong>: 详细描述（可选）</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">3.</span>
                  <span>资产编码必须唯一，建议使用有意义的编码规则（如：ASSET001、EQ-PROD-001）</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">4.</span>
                  <span>位置字段必须使用系统中已存在的位置名称（如：HPC-Production、AD-Production）</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">5.</span>
                  <span>上传文件后系统会自动验证数据格式，显示预览并标注所有错误</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">6.</span>
                  <span>只有通过验证的数据才能导入，失败的行会返回详细错误信息供您修正</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {currentStep === 'preview' && preview && (
          <ImportPreview
            preview={preview}
            onConfirm={handleConfirmImport}
            onCancel={handleCancel}
            isImporting={isLoading}
            type="assets"
          />
        )}

        {currentStep === 'result' && result && (
          <ImportResult
            result={result}
            onClose={handleClose}
            onViewList={handleViewAssetList}
            type="assets"
          />
        )}
      </div>
    </div>
  );
}