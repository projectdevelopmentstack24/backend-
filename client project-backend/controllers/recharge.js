const User = require('../models/user.model');
const MaintenanceSettings = require('../models/maintenanceSettings.model');
const { verifyTrxTransaction, getTrxExchangeRate } = require('../utils/tronHelper');
const { verifyUpiTransaction, generateUpiQR } = require('../utils/upiHelper');
const telegramNotifier = require('../utils/telegramNotification');

// Initiate recharge
exports.initiateRecharge = async (req, res) => {
    try {
        const { amount, paymentMethod } = req.body;
        const userId = req.user._id;

        // Check maintenance status
        const maintenance = await MaintenanceSettings.findOne();
        if (maintenance?.rechargeMaintenance?.[paymentMethod]?.isEnabled) {
            return res.status(503).json({
                success: false,
                error: maintenance.rechargeMaintenance[paymentMethod].message
            });
        }

        // Validate minimum amount
        const minAmount = parseInt(process.env.MIN_RECHARGE_AMOUNT) || 50;
        if (amount < minAmount) {
            return res.status(400).json({
                success: false,
                error: `Minimum recharge amount is ₹${minAmount}`
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        let transactionData;
        if (paymentMethod === 'tron') {
            const exchangeRate = await getTrxExchangeRate();
            const trxAmount = (amount / exchangeRate).toFixed(2);
            
            transactionData = {
                transactionId: `TRX${Date.now()}`,
                status: 'pending',
                walletDetails: {
                    address: user.trxAddress,
                    amount: trxAmount,
                    exchangeRate,
                    inr: amount
                }
            };
        } else if (paymentMethod === 'upi') {
            const qrData = await generateUpiQR(amount, process.env.UPI_ID);
            
            transactionData = {
                transactionId: `UPI${Date.now()}`,
                status: 'pending',
                upiDetails: {
                    qrCode: qrData.qrCode,
                    upiId: process.env.UPI_ID,
                    amount
                }
            };
        }

        // Save transaction
        user.transactions.push({
            ...transactionData,
            type: paymentMethod.toUpperCase(),
            amount,
            createdAt: new Date()
        });
        await user.save();

        res.json({
            success: true,
            ...transactionData
        });
    } catch (error) {
        console.error('Initiate Recharge Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get recharge history
exports.getHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const transactions = user.transactions
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(startIndex, endIndex)
            .map(t => ({
                id: t.transactionId,
                amount: t.amount,
                status: t.status,
                type: t.type,
                date: t.createdAt
            }));

        res.json({
            success: true,
            transactions,
            totalCount: user.transactions.length
        });
    } catch (error) {
        console.error('Get History Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Verify transaction
exports.verifyTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { hash } = req.query; // For TRX transactions
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const transaction = user.transactions.find(t => t.transactionId === transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        if (transaction.status === 'completed') {
            return res.json({
                success: true,
                status: 'completed',
                message: 'Transaction already verified',
                details: {
                    amount: transaction.amount,
                    paymentMethod: transaction.type,
                    timestamp: transaction.createdAt
                }
            });
        }

        let verificationResult;
        if (transaction.type === 'TRX') {
            verificationResult = await verifyTrxTransaction(hash, user.trxAddress, transaction.walletDetails.amount);
        } else {
            verificationResult = await verifyUpiTransaction(transactionId);
        }

        if (verificationResult.success) {
            // Update transaction status
            transaction.status = 'completed';
            transaction.verifiedAt = new Date();
            
            // Update user balance
            user.balance += transaction.amount;
            
            await user.save();

            // Send notification
            await telegramNotifier.sendMessage('recharge', {
                email: user.email,
                amount: transaction.amount,
                type: transaction.type,
                txnId: transactionId,
                time: new Date().toLocaleString()
            });
        }

        res.json({
            success: true,
            status: transaction.status,
            message: verificationResult.message,
            details: {
                amount: transaction.amount,
                paymentMethod: transaction.type,
                timestamp: transaction.createdAt
            }
        });
    } catch (error) {
        console.error('Verify Transaction Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get transaction status
exports.getTransactionStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const transaction = user.transactions.find(t => t.transactionId === transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            status: transaction.status,
            details: {
                amount: transaction.amount,
                timestamp: transaction.createdAt,
                method: transaction.type
            }
        });
    } catch (error) {
        console.error('Get Transaction Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}; 