import { Request, Response } from 'express';
import multer from 'multer';
import { ImportService } from '../services/ImportService';
import { UserRepository } from '../repositories/UserRepository';
import { UserService } from '../services/UserService';

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传CSV文件'));
    }
  },
});

export class ImportController {
  private importService: ImportService;

  constructor() {
    const userRepository = new UserRepository();
    const userService = new UserService(userRepository);
    this.importService = new ImportService(userRepository, userService);
  }

  /**
   * 文件上传中间件
   */
  uploadMiddleware = upload.single('file');

  /**
   * 下载用户CSV模板
   */
  downloadUserTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const template = this.importService.generateUserTemplate();
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="user_template.csv"');
      res.send('\uFEFF' + template); // 添加BOM以支持中文
    } catch (error) {
      console.error('Generate user template error:', error);
      res.status(500).json({
        success: false,
        message: '生成模板失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  /**
   * 下载资产CSV模板
   */
  downloadAssetTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const template = this.importService.generateAssetTemplate();
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="asset_template.csv"');
      res.send('\uFEFF' + template);
    } catch (error) {
      console.error('Generate asset template error:', error);
      res.status(500).json({
        success: false,
        message: '生成模板失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  /**
   * 预览用户CSV
   */
  previewUserCSV = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: '请上传CSV文件'
        });
        return;
      }

      const preview = await this.importService.previewUserCSV(req.file.buffer);
      
      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      console.error('Preview user CSV error:', error);
      res.status(400).json({
        success: false,
        message: '预览失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  /**
   * 预览资产CSV
   */
  previewAssetCSV = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: '请上传CSV文件'
        });
        return;
      }

      const preview = await this.importService.previewAssetCSV(req.file.buffer);
      
      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      console.error('Preview asset CSV error:', error);
      res.status(400).json({
        success: false,
        message: '预览失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  /**
   * 批量导入用户
   */
  importUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: '请上传CSV文件'
        });
        return;
      }

      const result = await this.importService.importUsers(req.file.buffer);
      
      res.json({
        success: true,
        message: `导入完成：成功 ${result.successful} 条，失败 ${result.failed} 条`,
        data: result
      });
    } catch (error) {
      console.error('Import users error:', error);
      res.status(500).json({
        success: false,
        message: '导入失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  /**
   * 批量导入资产
   */
  importAssets = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: '请上传CSV文件'
        });
        return;
      }

      const result = await this.importService.importAssets(req.file.buffer);
      
      res.json({
        success: true,
        message: `导入完成：成功 ${result.successful} 条，失败 ${result.failed} 条`,
        data: result
      });
    } catch (error) {
      console.error('Import assets error:', error);
      res.status(500).json({
        success: false,
        message: '导入失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };
}