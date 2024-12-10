import { Router } from 'express';
import * as apiController from '../controllers/api/index.js';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';
import { maintenanceCheckMiddleware } from '../middlewares/adminAuth.js';
import { validateRequest, schemas } from '../middlewares/validation';
import authMiddleware from '../middlewares/auth';
import authController from '../controllers/auth';
import rechargeController from '../controllers/recharge';
import userController from '../controllers/user';
import paymentController from '../controllers/payment';
import systemController from '../controllers/system';

const router = Router();

// Apply maintenance check middleware to all API routes
router.use(maintenanceCheckMiddleware);

// Public API endpoints (no auth required)
router.get('/service-list', apiController.getServiceList);
router.get('/server-list', apiController.getServerList);

// Protected API endpoints (require API key)
router.use(apiKeyAuth);

// Balance endpoints
router.get('/balance', apiController.getBalance);

// Number management endpoints
router.post('/number', apiController.getNumber);
router.get('/otp/:id', apiController.getOTP);
router.post('/cancel/:id', apiController.cancelNumber);
router.post('/next-otp/:id', apiController.getNextOTP);

// Service information endpoints
router.get('/list-price', apiController.getServicePrices);
router.post('/check-sms', apiController.checkSMS);

// Authentication Routes
router.post('/auth/login', validateRequest(schemas.login), authController.login);
router.post('/auth/register', validateRequest(schemas.register), authController.register);
router.post('/auth/verify-email', validateRequest(schemas.verifyEmail), authController.verifyEmail);
router.post('/auth/change-password', authMiddleware, validateRequest(schemas.changePassword), authController.changePassword);
router.post('/auth/check-otp', validateRequest(schemas.checkOtp), authController.checkOtp);
router.post('/auth/get-number', authMiddleware, validateRequest(schemas.getNumber), authController.getNumber);
router.post('/auth/send-verification-email', validateRequest(schemas.sendVerificationEmail), authController.sendVerificationEmail);

// Recharge Routes
router.post('/recharge/initiate', authMiddleware, validateRequest(schemas.initiateRecharge), rechargeController.initiateRecharge);
router.get('/recharge/history', authMiddleware, rechargeController.getHistory);
router.get('/recharge/verify/:transactionId', authMiddleware, rechargeController.verifyTransaction);
router.get('/recharge/status/:transactionId', authMiddleware, rechargeController.getTransactionStatus);

// User Profile Routes
router.get('/user/profile', authMiddleware, userController.getProfile);
router.put('/user/profile', authMiddleware, validateRequest(schemas.updateProfile), userController.updateProfile);
router.get('/user/balance', authMiddleware, userController.getBalance);

// Payment Method Routes
router.post('/payment/upi', authMiddleware, validateRequest(schemas.upiPayment), paymentController.processUpiPayment);
router.post('/payment/tron', authMiddleware, validateRequest(schemas.tronPayment), paymentController.processTronPayment);
router.get('/payment/methods', paymentController.getPaymentMethods);
router.post('/payment/verify-upi', authMiddleware, validateRequest(schemas.verifyUpi), paymentController.verifyUpiId);

// System Routes
router.get('/system/status', systemController.getSystemStatus);
router.get('/system/maintenance', systemController.getMaintenanceStatus);
router.get('/system/config', systemController.getSystemConfig);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

export default router; 