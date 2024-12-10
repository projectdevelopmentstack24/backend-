import ServiceModel from '../../models/service.model.js';
import ServerModel from '../../models/server.model.js';
import MaintenanceSettings from '../../models/maintenanceSettings.model.js';
import { fastSmsApi, fiveSimApi } from '../../utils/apiIntegration.js';
import telegramNotifier from '../../utils/telegramNotification.js';

const CANCEL_TIMEOUT = parseInt(process.env.CANCEL_TIMEOUT) || 120000; // 2 minutes
const ORDER_TIMEOUT = parseInt(process.env.ORDER_TIMEOUT) || 1200000; // 20 minutes

// Get user balance
export const getBalance = async (req, res) => {
    try {
        const { user } = req;
        res.json({ balance: user.balance });
    } catch (error) {
        console.error('Get Balance Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
};

// Get service list and prices
export const getServiceList = async (req, res) => {
    try {
        const services = await ServiceModel.find({
            'servers.isActive': true
        }).select('name servers').sort('name');

        res.json({ success: true, services });
    } catch (error) {
        console.error('Get Service List Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
};

// Get server list
export const getServerList = async (req, res) => {
    try {
        const servers = await ServerModel.find({
            maintainance: false
        }).select('server provider').sort('server');

        res.json({ success: true, servers });
    } catch (error) {
        console.error('Get Server List Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
};

// Get number
export const getNumber = async (req, res) => {
    try {
        const { user } = req;
        const { server, servicename } = req.query;

        // Validate inputs
        if (!server || !servicename) {
            return res.status(400).json({ error: 'missing parameters' });
        }

        // Check server maintenance
        const serverDoc = await ServerModel.findOne({ server });
        if (!serverDoc || serverDoc.maintainance) {
            return res.status(503).json({ error: 'under maintenance' });
        }

        // Get service details
        const service = await ServiceModel.findOne({
            name: servicename,
            'servers.serverId': server,
            'servers.isActive': true
        });

        if (!service) {
            return res.status(404).json({ error: 'no stock' });
        }

        const serverService = service.servers.find(s => s.serverId === server);
        if (!serverService) {
            return res.status(404).json({ error: 'no stock' });
        }

        // Check user balance
        if (user.balance < serverService.price) {
            return res.status(402).json({ error: 'low balance' });
        }

        // Get number from provider
        const numberResponse = serverDoc.provider === 'fastsms' 
            ? await fastSmsApi.getNumber(serverDoc.api_key, serverService.code)
            : await fiveSimApi.getNumber(serverDoc.api_key, serverService.code);

        if (numberResponse.error) {
            return res.status(400).json({ error: numberResponse.error });
        }

        // Deduct balance and save order
        user.balance -= serverService.price;
        user.orders.push({
            id: numberResponse.id,
            number: numberResponse.number,
            service: servicename,
            server,
            price: serverService.price,
            status: 'active',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + ORDER_TIMEOUT)
        });
        await user.save();

        // Send notification
        await telegramNotifier.sendMessage('numberPurchase', {
            email: user.email,
            service: servicename,
            server,
            price: serverService.price,
            time: new Date().toLocaleString()
        });

        res.json({
            status: 'ok',
            number: numberResponse.number,
            id: numberResponse.id
        });
    } catch (error) {
        console.error('Get Number Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
};

// Get OTP
export const getOTP = async (req, res) => {
    try {
        const { user } = req;
        const { id } = req.params;

        // Find order
        const order = user.orders.find(o => o.id === id && o.status === 'active');
        if (!order) {
            return res.status(404).json({ error: 'order not found' });
        }

        // Get server details
        const server = await ServerModel.findOne({ server: order.server });
        if (!server) {
            return res.status(404).json({ error: 'server not found' });
        }

        // Get OTP from provider
        const otpResponse = server.provider === 'fastsms'
            ? await fastSmsApi.getOtp(server.api_key, id)
            : await fiveSimApi.getOtp(server.api_key, id);

        if (otpResponse.error) {
            return res.status(400).json({ error: otpResponse.error });
        }

        // If OTP received, update order
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

        res.json({
            status: 'ok',
            otp: otpResponse.otp || 'waiting for otp'
        });
    } catch (error) {
        console.error('Get OTP Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
};

// Cancel number
export const cancelNumber = async (req, res) => {
    try {
        const { user } = req;
        const { id } = req.params;

        // Find order
        const order = user.orders.find(o => o.id === id && o.status === 'active');
        if (!order) {
            return res.status(404).json({ error: 'order not found' });
        }

        // Check if order can be cancelled
        const timeSinceOrder = Date.now() - order.createdAt;
        if (timeSinceOrder < CANCEL_TIMEOUT) {
            return res.status(400).json({ error: 'wait 2 minutes before cancel' });
        }

        if (order.otps.length > 0) {
            return res.status(400).json({ error: 'otp already come' });
        }

        // Get server details
        const server = await ServerModel.findOne({ server: order.server });
        if (!server) {
            return res.status(404).json({ error: 'server not found' });
        }

        // Cancel number with provider
        const cancelResponse = server.provider === 'fastsms'
            ? await fastSmsApi.cancelNumber(server.api_key, id)
            : await fiveSimApi.cancelNumber(server.api_key, id);

        if (cancelResponse.error) {
            return res.status(400).json({ error: cancelResponse.error });
        }

        // Update order and refund balance
        order.status = 'cancelled';
        user.balance += order.price;
        await user.save();

        // Send notification
        await telegramNotifier.sendMessage('numberCancelled', {
            email: user.email,
            service: order.service,
            server: order.server,
            number: order.number,
            time: new Date().toLocaleString()
        });

        res.json({ status: 'success' });
    } catch (error) {
        console.error('Cancel Number Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
};

// Get next OTP
export const getNextOTP = async (req, res) => {
    try {
        const { user } = req;
        const { id } = req.params;

        // Find order
        const order = user.orders.find(o => o.id === id && o.status === 'active');
        if (!order) {
            return res.status(404).json({ error: 'order not found' });
        }

        // Get server details
        const server = await ServerModel.findOne({ server: order.server });
        if (!server) {
            return res.status(404).json({ error: 'server not found' });
        }

        // Request next OTP from provider
        const nextOtpResponse = server.provider === 'fastsms'
            ? await fastSmsApi.getNextOtp(server.api_key, id)
            : await fiveSimApi.getNextOtp(server.api_key, id);

        if (nextOtpResponse.error) {
            return res.status(400).json({ error: nextOtpResponse.error });
        }

        res.json({ status: 'success' });
    } catch (error) {
        console.error('Next OTP Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
};

// Get service prices
export const getServicePrices = async (req, res) => {
    try {
        const services = await ServiceModel.find({
            'servers.isActive': true
        }).select('name servers averagePrice').sort('name');

        const priceList = services.map(service => ({
            name: service.name,
            averagePrice: service.averagePrice,
            servers: service.servers
                .filter(s => s.isActive)
                .map(s => ({
                    server: s.serverId,
                    price: s.price
                }))
        }));

        res.json({ success: true, services: priceList });
    } catch (error) {
        console.error('Get Service Prices Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
};

// Check SMS
export const checkSMS = async (req, res) => {
    try {
        const { sms } = req.body;
        if (!sms) {
            return res.status(400).json({ error: 'SMS text is required' });
        }

        // Get first active server with FastSMS provider
        const server = await ServerModel.findOne({
            provider: 'fastsms',
            maintainance: false
        });

        if (!server) {
            return res.status(503).json({ error: 'service unavailable' });
        }

        // Check SMS with FastSMS API
        const response = await fastSmsApi.checkSms(server.api_key, sms);
        if (response.error) {
            return res.status(400).json({ error: response.error });
        }

        res.json(response);
    } catch (error) {
        console.error('Check SMS Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
}; 