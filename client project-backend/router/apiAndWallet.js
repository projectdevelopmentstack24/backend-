import { Router } from 'express';
import * as apiAndWalletController from '../controllers/apiAndWallet.js';
import authMiddleware from '../middlewares/auth.js';
import { validateRequest, schemas } from '../middlewares/validation.js';

const router = Router();

// API key routes
router.get('/api-key', authMiddleware, apiAndWalletController.getApiKey);
router.post('/api-key/generate', authMiddleware, apiAndWalletController.generateApiKey);

// Wallet routes
router.get('/balance', authMiddleware, apiAndWalletController.getWalletBalance);
router.get('/transactions', authMiddleware, apiAndWalletController.getWalletTransactions);
router.post('/transfer', 
    authMiddleware, 
    validateRequest(schemas.transfer), 
    apiAndWalletController.transferBalance
);

export default router;
