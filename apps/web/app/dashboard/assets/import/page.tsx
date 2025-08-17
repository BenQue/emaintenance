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
                  <span>点击"下载CSV模板"获取标准格式的模板文件</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">2.</span>
                  <span>按照模板格式填写设备信息，必填字段包括：资产编码、资产名称、位置</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">3.</span>
                  <span>资产编码必须唯一，建议使用有意义的编码规则（如：EQ001、PROD-001等）</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">4.</span>
                  <span>安装日期格式请使用：YYYY-MM-DD（如：2024-01-15）</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">5.</span>
                  <span>上传文件后系统会自动验证数据格式，有错误的行会显示详细说明</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-blue-600">6.</span>
                  <span>导入成功的设备状态默认为"激活"，可以在设备管理中进行进一步配置</span>
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