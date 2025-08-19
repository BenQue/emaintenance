import { Router } from 'express';
import { ImportController } from '../controllers/ImportController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/roleAuth';

const router = Router();
const importController = new ImportController();

// 所有导入功能都需要ADMIN权限（批量导入是敏感操作）
const requireAdminRole = authorizeRoles(['ADMIN']);

// CSV模板下载 - 不需要文件上传
router.get('/templates/users', 
  authenticate, 
  requireAdminRole, 
  (req, res) => importController.downloadUserTemplate(req, res)
);

router.get('/templates/assets', 
  authenticate, 
  requireAdminRole, 
  (req, res) => importController.downloadAssetTemplate(req, res)
);

// CSV预览 - 需要文件上传但不实际导入
router.post('/preview/users',
  authenticate,
  requireAdminRole,
  importController.uploadMiddleware,
  (req, res) => importController.previewUserCSV(req, res)
);

router.post('/preview/assets',
  authenticate,
  requireAdminRole,
  importController.uploadMiddleware,
  (req, res) => importController.previewAssetCSV(req, res)
);

// 实际导入 - 需要文件上传并执行导入
router.post('/users',
  authenticate,
  requireAdminRole,
  importController.uploadMiddleware,
  (req, res) => importController.importUsers(req, res)
);

router.post('/assets',
  authenticate,
  requireAdminRole,
  importController.uploadMiddleware,
  (req, res) => importController.importAssets(req, res)
);

export default router;