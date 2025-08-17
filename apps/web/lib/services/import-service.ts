import { apiClient } from './api-client';

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
  private baseUrl = '/api/import';

  /**
   * 下载用户CSV模板
   */
  async downloadUserTemplate(): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/templates/users`, {
      responseType: 'blob'
    });
    return response.data as Blob;
  }

  /**
   * 下载资产CSV模板
   */
  async downloadAssetTemplate(): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/templates/assets`, {
      responseType: 'blob'
    });
    return response.data as Blob;
  }

  /**
   * 预览用户CSV
   */
  async previewUserCSV(file: File): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/preview/users`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return (response.data as any).data;
  }

  /**
   * 预览资产CSV
   */
  async previewAssetCSV(file: File): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/preview/assets`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return (response.data as any).data;
  }

  /**
   * 导入用户
   */
  async importUsers(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/users`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return (response.data as any).data;
  }

  /**
   * 导入资产
   */
  async importAssets(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/assets`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return (response.data as any).data;
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