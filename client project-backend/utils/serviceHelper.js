const mongoose = require('mongoose');
const ServiceModel = require('../models/service.model');
const ServerModel = require('../models/server.model');
const telegramNotifier = require('./telegramNotification');

class ServiceHelper {
    static async retryOperation(operation, maxRetries = 3) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        throw lastError;
    }

    static async getService(serviceName, serverId) {
        return this.retryOperation(async () => {
            const service = await ServiceModel.findOne({
                name: serviceName,
                'servers.serverId': serverId,
                'servers.isActive': true
            });

            if (!service) {
                throw new Error('Service not available');
            }

            const server = await ServerModel.findOne({
                server: serverId,
                maintainance: false
            });

            if (!server) {
                throw new Error('Server under maintenance');
            }

            return { service, server };
        });
    }

    static async processOrder(userId, serviceName, serverId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get service and server
            const { service, server } = await this.getService(serviceName, serverId);
            const serverService = service.servers.find(s => s.serverId === serverId);

            // Get number from provider
            const numberResponse = await this.retryOperation(async () => {
                return server.provider === 'fastsms'
                    ? await fastSmsApi.getNumber(server.api_key, serverService.code)
                    : await fiveSimApi.getNumber(server.api_key, serverService.code);
            });

            if (numberResponse.error) {
                throw new Error(numberResponse.error);
            }

            // Create order
            const order = {
                id: numberResponse.id,
                number: numberResponse.number,
                service: serviceName,
                server: serverId,
                price: serverService.price,
                status: 'active',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + ORDER_TIMEOUT)
            };

            // Update user
            await User.findByIdAndUpdate(
                userId,
                {
                    $push: { orders: order },
                    $inc: { balance: -serverService.price }
                },
                { session }
            );

            // Commit transaction
            await session.commitTransaction();
            session.endSession();

            // Send notification
            await telegramNotifier.sendMessage('numberPurchase', {
                email: user.email,
                service: serviceName,
                server: serverId,
                price: serverService.price,
                time: new Date().toLocaleString()
            });

            return { success: true, order };
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            return { success: false, error: error.message };
        }
    }

    static async cancelOrder(userId, orderId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get user and order
            const user = await User.findById(userId).session(session);
            const order = user.orders.find(o => o.id === orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.status !== 'active') {
                throw new Error('Order cannot be cancelled');
            }

            const timeSinceOrder = Date.now() - new Date(order.createdAt).getTime();
            if (timeSinceOrder < CANCEL_TIMEOUT) {
                throw new Error('Cannot cancel before 2 minutes');
            }

            // Get server
            const server = await ServerModel.findOne({ server: order.server });
            if (!server) {
                throw new Error('Server not found');
            }

            // Cancel number with provider
            const cancelResponse = await this.retryOperation(async () => {
                return server.provider === 'fastsms'
                    ? await fastSmsApi.cancelNumber(server.api_key, orderId)
                    : await fiveSimApi.cancelNumber(server.api_key, orderId);
            });

            if (cancelResponse.error) {
                throw new Error(cancelResponse.error);
            }

            // Update order and refund
            order.status = 'cancelled';
            user.balance += order.price;
            await user.save({ session });

            // Commit transaction
            await session.commitTransaction();
            session.endSession();

            // Send notification
            await telegramNotifier.sendMessage('numberCancelled', {
                email: user.email,
                service: order.service,
                server: order.server,
                number: order.number,
                time: new Date().toLocaleString()
            });

            return { success: true };
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            return { success: false, error: error.message };
        }
    }

    static async checkOTP(userId, orderId) {
        try {
            // Get user and order
            const user = await User.findById(userId);
            const order = user.orders.find(o => o.id === orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.status !== 'active') {
                throw new Error('Order not active');
            }

            // Get server
            const server = await ServerModel.findOne({ server: order.server });
            if (!server) {
                throw new Error('Server not found');
            }

            // Get OTP from provider
            const otpResponse = await this.retryOperation(async () => {
                return server.provider === 'fastsms'
                    ? await fastSmsApi.getOtp(server.api_key, orderId)
                    : await fiveSimApi.getOtp(server.api_key, orderId);
            });

            if (otpResponse.error) {
                throw new Error(otpResponse.error);
            }

            // If OTP received
            if (otpResponse.otp && otpResponse.otp !== 'waiting for otp') {
                order.otps.push({
                    otp: otpResponse.otp,
                    receivedAt: new Date()
                });
                order.status = 'completed';
                await user.save();

                // Send notification
                await telegramNotifier.sendMessage('otpReceived', {
                    email: user.email,
                    service: order.service,
                    server: order.server,
                    number: order.number,
                    time: new Date().toLocaleString()
                });
            }

            return {
                success: true,
                status: order.status,
                otp: otpResponse.otp
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = ServiceHelper; 