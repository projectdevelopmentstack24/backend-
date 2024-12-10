import axios from 'axios';
import User from '../models/user.model.js';
import RechargeHistory from '../models/history.js';
import telegramNotifier from './telegramNotification.js';
import MaintenanceSettings from '../models/maintenanceSettings.model.js';

class RechargeHandler {
    constructor() {
        this.maintenanceSettings = null;
        this.initialize();
    }

    async initialize() {
        try {
            this.maintenanceSettings = await MaintenanceSettings.findOne({});
        } catch (error) {
            console.error('Error initializing recharge handler:', error);
        }
    }

    async checkMaintenance(type) {
        if (!this.maintenanceSettings) {
            await this.initialize();
        }
        return this.maintenanceSettings?.isRechargeUnderMaintenance(type) || false;
    }

    async handleTrxRecharge(userId, amount, hash) {
        try {
            if (await this.checkMaintenance('trx')) {
                return { error: 'TRX recharge is under maintenance' };
            }

            const user = await User.findById(userId);
            if (!user) {
                return { error: 'User not found' };
            }

            // Get TRX exchange rate
            const { data: exchangeRate } = await axios.get('https://min-api.cryptocompare.com/data/price?fsym=TRX&tsyms=INR');
            if (!exchangeRate || !exchangeRate.INR) {
                return { error: 'Failed to get exchange rate' };
            }

            // Verify transaction
            const { data: txnData } = await axios.get(`https://own5k.in/tron/?type=txnid&address=${user.trxAddress}&hash=${hash}`);
            if (!txnData || txnData.error) {
                return { error: 'Invalid transaction' };
            }

            const trxAmount = txnData.amount;
            const inrAmount = trxAmount * exchangeRate.INR;

            // Update user balance
            await user.updateBalance(inrAmount);
            user.totalRechargeAmount += inrAmount;
            await user.save();

            // Record recharge history
            const rechargeHistory = new RechargeHistory({
                userId: user._id,
                transactionId: hash,
                type: 'TRX',
                trxAmount,
                exchangeRate: exchangeRate.INR,
                amount: inrAmount
            });
            await rechargeHistory.save();

            // Forward TRX to main account
            const { data: transferData } = await axios.get(
                `https://own5k.in/tron/?type=send&from=${user.trxAddress}&key=${user.trxPrivateKey}&to=${process.env.MAIN_TRX_ADDRESS}`
            );

            if (!transferData || transferData.error) {
                console.error('Failed to forward TRX:', transferData);
            }

            // Send notification
            await telegramNotifier.notifyRecharge({
                email: user.email,
                amount: inrAmount,
                type: 'TRX',
                transactionId: hash
            });

            return {
                success: true,
                message: `₹${inrAmount} added to your wallet`,
                balance: user.balance
            };
        } catch (error) {
            console.error('Error in TRX recharge:', error);
            return { error: 'Internal server error' };
        }
    }

    async handleUpiRecharge(userId, amount, transactionId) {
        try {
            if (await this.checkMaintenance('upi')) {
                return { error: 'UPI recharge is under maintenance' };
            }

            if (amount < 50) {
                return { error: 'Minimum recharge amount is ₹50' };
            }

            const user = await User.findById(userId);
            if (!user) {
                return { error: 'User not found' };
            }

            // Verify UPI transaction
            const { data: upiData } = await axios.get(`https://own5k.in/p/u.php?txn=${transactionId}`);
            
            if (upiData.error === '400') {
                return { error: 'Transaction not found' };
            }
            if (upiData.error === 'UTR must be 12 digits') {
                return { error: 'Invalid transaction ID' };
            }
            if (!upiData || !upiData.amount) {
                return { error: 'Invalid transaction' };
            }

            const verifiedAmount = parseFloat(upiData.amount);
            if (verifiedAmount !== amount) {
                return { error: 'Transaction amount mismatch' };
            }

            // Update user balance
            await user.updateBalance(amount);
            user.totalRechargeAmount += amount;
            await user.save();

            // Record recharge history
            const rechargeHistory = new RechargeHistory({
                userId: user._id,
                transactionId,
                type: 'UPI',
                amount
            });
            await rechargeHistory.save();

            // Send notification
            await telegramNotifier.notifyRecharge({
                email: user.email,
                amount,
                type: 'UPI',
                transactionId
            });

            return {
                success: true,
                message: `₹${amount} added to your wallet`,
                balance: user.balance
            };
        } catch (error) {
            console.error('Error in UPI recharge:', error);
            return { error: 'Internal server error' };
        }
    }

    async handleAdminRecharge(userId, amount, adminId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return { error: 'User not found' };
            }

            // Update user balance
            await user.updateBalance(amount);
            user.totalRechargeAmount += amount;
            await user.save();

            // Record recharge history
            const rechargeHistory = new RechargeHistory({
                userId: user._id,
                transactionId: 'Admin',
                type: 'Admin',
                amount,
                adminId
            });
            await rechargeHistory.save();

            // Send notification
            await telegramNotifier.notifyRecharge({
                email: user.email,
                amount,
                type: 'Admin',
                transactionId: 'Admin'
            });

            return {
                success: true,
                message: `₹${amount} added to user's wallet`,
                balance: user.balance
            };
        } catch (error) {
            console.error('Error in admin recharge:', error);
            return { error: 'Internal server error' };
        }
    }

    async generateUpiQr(amount) {
        try {
            if (await this.checkMaintenance('upi')) {
                return { error: 'UPI recharge is under maintenance' };
            }

            if (amount < 50) {
                return { error: 'Minimum recharge amount is ₹50' };
            }

            // Get UPI details from environment variables
            const upiId = process.env.UPI_ID;
            if (!upiId) {
                return { error: 'UPI configuration missing' };
            }

            // Generate UPI QR code data
            const upiData = `upi://pay?pa=${upiId}&pn=Virtual%20Number%20Service&am=${amount}&cu=INR`;
            
            return {
                success: true,
                upiData,
                upiId,
                amount
            };
        } catch (error) {
            console.error('Error generating UPI QR:', error);
            return { error: 'Internal server error' };
        }
    }
}

export default new RechargeHandler(); 