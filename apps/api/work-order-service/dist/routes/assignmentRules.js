"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const AssignmentRuleController_1 = require("../controllers/AssignmentRuleController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const assignmentRuleController = new AssignmentRuleController_1.AssignmentRuleController(prisma);
// All routes require authentication
router.use(auth_1.authenticate);
// Assignment rule CRUD routes - require supervisor or admin role
router.post('/', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), (req, res) => assignmentRuleController.createRule(req, res));
router.get('/', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), (req, res) => assignmentRuleController.getRules(req, res));
router.get('/:id', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), (req, res) => assignmentRuleController.getRuleById(req, res));
router.put('/:id', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), (req, res) => assignmentRuleController.updateRule(req, res));
router.delete('/:id', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), (req, res) => assignmentRuleController.deleteRule(req, res));
exports.default = router;
