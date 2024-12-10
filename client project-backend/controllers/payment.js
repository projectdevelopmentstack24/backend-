const MaintenanceSettings = require('../models/maintenanceSettings.model');
const { verifyUpiId, generateUpiQR } = require('../utils/upiHelper');
const { getTrxExchangeRate } = require('../utils/tronHelper');

// Process UPI payment
exports.processUpiPayment = async (req, res) => {
    try {
        const { amount, upiId, purpose } = req.body;

        // Check maintenance status
        const maintenance = await MaintenanceSettings.findOne();
        if (maintenance?.rechargeMaintenance?.upi?.isEnabled) {
            return res.status(503).json({
                success: false,
                error: maintenance.rechargeMaintenance.upi.message
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

        // Generate QR code
        const qrData = await generateUpiQR(amount, process.env.UPI_ID, purpose);

        res.json({
            success: true,
            transactionId: `UPI${Date.now()}`,
            status: 'pending',
            upiUrl: qrData.upiUrl,
            qrCode: qrData.qrCode
        });
    } catch (error) {
        console.error('Process UPI Payment Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Process TRON payment
exports.processTronPayment = async (req, res) => {
    try {
        const { amount, walletAddress } = req.body;

        // Check maintenance status
        const maintenance = await MaintenanceSettings.findOne();
        if (maintenance?.rechargeMaintenance?.trx?.isEnabled) {
            return res.status(503).json({
                success: false,
                error: maintenance.rechargeMaintenance.trx.message
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

        // Get TRX exchange rate
        const exchangeRate = await getTrxExchangeRate();
        const trxAmount = (amount / exchangeRate).toFixed(2);

        res.json({
            success: true,
            transactionId: `TRX${Date.now()}`,
            status: 'pending',
            walletDetails: {
                address: walletAddress,
                amount: trxAmount,
                network: 'TRON',
                exchangeRate
            }
        });
    } catch (error) {
        console.error('Process TRON Payment Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get payment methods
exports.getPaymentMethods = async (req, res) => {
    try {
        const maintenance = await MaintenanceSettings.findOne();
        
        const methods = [
            {
                id: 'upi',
                name: 'UPI Payment',
                type: 'UPI',
                enabled: !maintenance?.rechargeMaintenance?.upi?.isEnabled,
                minAmount: parseInt(process.env.MIN_RECHARGE_AMOUNT) || 50,
                icon: 'upi-icon-url'
            },
            {
                id: 'tron',
                name: 'TRON/TRX',
                type: 'CRYPTO',
                enabled: !maintenance?.rechargeMaintenance?.trx?.isEnabled,
                minAmount: parseInt(process.env.MIN_RECHARGE_AMOUNT) || 50,
                icon: 'tron-icon-url'
            }
        ];

        res.json({
            success: true,
            methods
        });
    } catch (error) {
        console.error('Get Payment Methods Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Verify UPI ID
exports.verifyUpiId = async (req, res) => {
    try {
        const { upiId } = req.body;

        const verificationResult = await verifyUpiId(upiId);
        if (!verificationResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid UPI ID'
            });
        }

        res.json({
            success: true,
            valid: true,
            name: verificationResult.name
        });
    } catch (error) {
        console.error('Verify UPI ID Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}; 