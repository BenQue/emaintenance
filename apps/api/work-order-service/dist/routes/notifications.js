"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const NotificationController_1 = require("../controllers/NotificationController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const notificationController = new NotificationController_1.NotificationController(prisma);
// All routes require authentication
router.use(auth_1.authenticate);
// User notification routes - accessible to all authenticated users
router.get('/my', (req, res) => notificationController.getUserNotifications(req, res));
router.get('/my/stats', (req, res) => notificationController.getUserStats(req, res));
router.put('/my/mark-all-read', (req, res) => notificationController.markAllAsRead(req, res));
router.get('/my/:id', (req, res) => notificationController.getNotificationById(req, res));
router.put('/my/:id/read', (req, res) => notificationController.markAsRead(req, res));
// Supervisor notification routes - accessible to supervisors and admins
router.get('/all', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), (req, res) => notificationController.getAllNotifications(req, res));
exports.default = router;
