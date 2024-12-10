const mongoose = require('mongoose');
const User = require('../models/user.model');
const telegramNotifier = require('./telegramNotification');

class TransactionHelper {
    static async executeTransaction(userId, amount, type, operation) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Lock user document for atomic operation
            const user = await User.findById(userId).session(session);
            if (!user) {
                throw new Error('User not found');
            }

            // Check for duplicate transaction in last 5 minutes
            const recentTransaction = user.transactions.find(t => 
                t.amount === amount && 
                t.type === type && 
                (Date.now() - new Date(t.createdAt).getTime()) < 5 * 60 * 1000
            );
            if (recentTransaction) {
                throw new Error('Duplicate transaction detected');
            }

            // Execute the transaction operation
            const result = await operation(user, session);

            // Commit transaction
            await session.commitTransaction();
            session.endSession();

            // Send notification
            await telegramNotifier.sendMessage('transaction', {
                email: user.email,
                amount,
                type,
                status: 'success',
                time: new Date().toLocaleString()
            });

            return { success: true, data: result };
        } catch (error) {
            // Rollback transaction
            await session.abortTransaction();
            session.endSession();

            console.error('Transaction Error:', error);
            return { success: false, error: error.message };
        }
    }

    static async processRecharge(userId, amount, type, details) {
        return this.executeTransaction(userId, amount, type, async (user, session) => {
            // Add transaction record
            user.transactions.push({
                transactionId: `${type}${Date.now()}`,
                type: type.toUpperCase(),
                amount,
                status: 'pending',
                details,
                createdAt: new Date()
            });

            await user.save({ session });
            return user.transactions[user.transactions.length - 1];
        });
    }

    static async completeRecharge(userId, transactionId) {
        return this.executeTransaction(userId, 0, 'COMPLETE', async (user, session) => {
            const transaction = user.transactions.find(t => t.transactionId === transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            if (transaction.status === 'completed') {
                throw new Error('Transaction already completed');
            }

            // Update transaction status
            transaction.status = 'completed';
            transaction.completedAt = new Date();

            // Update user balance
            user.balance += transaction.amount;

            await user.save({ session });
            return transaction;
        });
    }

    static async processPayment(userId, amount, serviceDetails) {
        return this.executeTransaction(userId, amount, 'PAYMENT', async (user, session) => {
            if (user.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Deduct balance
            user.balance -= amount;

            // Add transaction record
            user.transactions.push({
                transactionId: `PAY${Date.now()}`,
                type: 'PAYMENT',
                amount: -amount,
                status: 'completed',
                details: serviceDetails,
                createdAt: new Date(),
                completedAt: new Date()
            });

            await user.save({ session });
            return user.transactions[user.transactions.length - 1];
        });
    }

    static async refundPayment(userId, transactionId) {
        return this.executeTransaction(userId, 0, 'REFUND', async (user, session) => {
            const transaction = user.transactions.find(t => t.transactionId === transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            if (transaction.type !== 'PAYMENT' || transaction.status !== 'completed') {
                throw new Error('Invalid transaction for refund');
            }

            if (transaction.refunded) {
                throw new Error('Transaction already refunded');
            }

            // Refund amount
            user.balance -= transaction.amount; // Amount is negative for payments
            transaction.refunded = true;
            transaction.refundedAt = new Date();

            await user.save({ session });
            return transaction;
        });
    }
}

module.exports = TransactionHelper; 