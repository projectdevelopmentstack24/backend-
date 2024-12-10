import User from '../models/user.model.js';
import { isValidAmount } from '../utils/validation.js';
import TransactionHelper from '../utils/transactionHelper.js';

// Get API key
export const getApiKey = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            apiKey: user.apiKey
        });
    } catch (error) {
        console.error('Get API Key Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Generate new API key
export const generateApiKey = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Generate new API key
        user.generateApiKey();
        await user.save();

        res.json({
            success: true,
            apiKey: user.apiKey
        });
    } catch (error) {
        console.error('Generate API Key Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get wallet balance
export const getWalletBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            balance: user.balance
        });
    } catch (error) {
        console.error('Get Wallet Balance Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get wallet transactions
export const getWalletTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const transactions = user.transactions
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            transactions,
            total: user.transactions.length,
            page: parseInt(page),
            totalPages: Math.ceil(user.transactions.length / limit)
        });
    } catch (error) {
        console.error('Get Wallet Transactions Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Transfer balance to another user
export const transferBalance = async (req, res) => {
    try {
        const { recipientEmail, amount } = req.body;

        // Validate amount
        if (!isValidAmount(amount)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid transfer amount'
            });
        }

        // Get sender
        const sender = await User.findById(req.user._id);
        if (!sender) {
            return res.status(404).json({
                success: false,
                error: 'Sender not found'
            });
        }

        // Check sender balance
        if (sender.balance < amount) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance'
            });
        }

        // Get recipient
        const recipient = await User.findOne({ email: recipientEmail });
        if (!recipient) {
            return res.status(404).json({
                success: false,
                error: 'Recipient not found'
            });
        }

        // Process transfer
        const result = await TransactionHelper.executeTransaction(
            sender._id,
            amount,
            'TRANSFER',
            async (user, session) => {
                // Deduct from sender
                user.balance -= amount;
                await user.save({ session });

                // Add to recipient
                recipient.balance += amount;
                recipient.transactions.push({
                    type: 'TRANSFER_RECEIVED',
                    amount,
                    details: { from: sender.email },
                    status: 'completed',
                    createdAt: new Date(),
                    completedAt: new Date()
                });
                await recipient.save({ session });

                return {
                    senderBalance: user.balance,
                    recipientBalance: recipient.balance
                };
            }
        );

        if (!result.success) {
            throw new Error(result.error);
        }

        res.json({
            success: true,
            message: 'Transfer successful',
            balance: result.data.senderBalance
        });
    } catch (error) {
        console.error('Transfer Balance Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}; 