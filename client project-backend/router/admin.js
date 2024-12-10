import { Router } from 'express';
import * as authController from '../controllers/admin/auth.js';
import * as maintenanceController from '../controllers/admin/maintenance.js';
import * as promoController from '../controllers/admin/promo.js';
import * as serviceController from '../controllers/admin/service.js';
import * as serverController from '../controllers/admin/server.js';
import { adminAuthMiddleware } from '../middlewares/adminAuth.js';

const router = Router();

// Auth routes
router.post('/login', authController.login);
router.post('/verify-2fa', authController.verify2FA);
router.post('/logout', adminAuthMiddleware, authController.logout);

// Maintenance routes
router.get('/maintenance', adminAuthMiddleware, maintenanceController.getMaintenanceStatus);
router.post('/maintenance', adminAuthMiddleware, maintenanceController.setMaintenanceStatus);

// Promo code routes
router.get('/promo-codes', adminAuthMiddleware, promoController.getPromoCodes);
router.post('/promo-codes', adminAuthMiddleware, promoController.createPromoCode);
router.put('/promo-codes/:code', adminAuthMiddleware, promoController.updatePromoCode);
router.delete('/promo-codes/:code', adminAuthMiddleware, promoController.deletePromoCode);

// Service routes
router.get('/services', adminAuthMiddleware, serviceController.getServices);
router.get('/services/stats', adminAuthMiddleware, serviceController.getServiceStats);
router.get('/services/:name', adminAuthMiddleware, serviceController.getServiceByName);
router.post('/services/sync', adminAuthMiddleware, serviceController.syncServices);

// Server routes
router.get('/servers', adminAuthMiddleware, serverController.getServers);
router.post('/servers', adminAuthMiddleware, serverController.addServer);
router.put('/servers/:server', adminAuthMiddleware, serverController.updateServer);
router.delete('/servers/:server', adminAuthMiddleware, serverController.deleteServer);
router.post('/servers/:server/check-balance', adminAuthMiddleware, serverController.checkBalance);

export default router; 