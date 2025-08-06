"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const userController = new UserController_1.UserController();
// All user management routes require authentication and supervisor/admin role
router.use(auth_1.authenticate);
router.use(auth_1.requireSupervisor);
// User management routes
router.get('/', userController.getUsers);
router.get('/search', userController.searchUsers);
router.get('/role/:role', userController.getUsersByRole);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/role', userController.updateUserRole);
router.patch('/:id/status', userController.updateUserStatus);
router.delete('/:id', userController.deleteUser);
router.post('/bulk', userController.bulkOperation);
exports.default = router;
