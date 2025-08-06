"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
const authController = new AuthController_1.AuthController();
// Authentication routes with rate limiting
router.post('/register', rateLimiter_1.authRateLimit, authController.register);
router.post('/login', rateLimiter_1.authRateLimit, authController.login);
// Protected routes
router.get('/profile', auth_1.authenticate, authController.profile);
exports.default = router;
