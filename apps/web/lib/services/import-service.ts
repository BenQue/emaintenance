import { apiClient, assetServiceClient } from './api-client';
import { buildApiUrl } from '../config/api-config';
import { authService } from './auth-service';

export interface ImportPreview {
  headers: string[];
  sampleData: any[];
  totalRows: number;
  validation: {
    valid: number;
    invalid: number;
    errors: Array<{
      row: number;
      field: string;
      error: string;
      data: any;
    }>;
  };
}

export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
  imported: any[];
}

export class ImportService {
  /**
   * 下载用户CSV模板
   */
  async downloadUserTemplate(): Promise<Blob> {
    const url = buildApiUrl('/api/import/templates/users', 'user');
    const token = authService.getToken();

    if (!token) {
      throw new Error('未登录，请先登录后再下载模板');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`下载模板失败: ${response.status} ${errorText}`);
    }

    return await response.blob();
  }

  /**
   * 下载资产CSV模板
   */
  async downloadAssetTemplate(): Promise<Blob> {
    const url = buildApiUrl('/api/import/templates/assets', 'asset');
    const token = authService.getToken();

    if (!token) {
      throw new Error('未登录，请先登录后再下载模板');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`下载模板失败: ${response.status} ${errorText}`);
    }

    return await response.blob();
  }

  /**
   * 预览用户CSV
   */
  async previewUserCSV(file: File): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);

    const url = buildApiUrl('/api/import/preview/users', 'user');
    const token = authService.getToken();

    if (!token) {
      throw new Error('未登录，请先登录');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '预览失败');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 预览资产CSV
   */
  async previewAssetCSV(file: File): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);

    const url = buildApiUrl('/api/import/preview/assets', 'asset');
    const token = authService.getToken();

    if (!token) {
      throw new Error('未登录，请先登录');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '预览失败');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 导入用户
   */
  async importUsers(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const url = buildApiUrl('/api/import/users', 'user');
    const token = authService.getToken();

    if (!token) {
      throw new Error('未登录，请先登录');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '导入失败');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 导入资产
   */
  async importAssets(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const url = buildApiUrl('/api/import/assets', 'asset');
    const token = authService.getToken();

    if (!token) {
      throw new Error('未登录，请先登录');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '导入失败');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 创建下载链接
   */
  createDownloadLink(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const importService = new ImportService();