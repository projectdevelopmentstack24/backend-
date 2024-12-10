import axios from 'axios';
import TelegramNotification from '../models/telegramNotification.model.js';

class TelegramNotifier {
    constructor() {
        this.notificationSettings = null;
    }

    async initialize() {
        try {
            this.notificationSettings = await TelegramNotification.findOne({ isEnabled: true });
            if (!this.notificationSettings) {
                console.error('Telegram notification settings not found or disabled');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error initializing Telegram notifier:', error);
            return false;
        }
    }

    async sendMessage(message) {
        if (!this.notificationSettings) {
            await this.initialize();
        }

        if (!this.notificationSettings || !this.notificationSettings.isEnabled) {
            return false;
        }

        try {
            const url = `https://api.telegram.org/bot${this.notificationSettings.botToken}/sendMessage`;
            await axios.post(url, {
                chat_id: this.notificationSettings.chatId,
                text: message,
                parse_mode: 'HTML'
            });
            return true;
        } catch (error) {
            console.error('Error sending Telegram message:', error);
            return false;
        }
    }

    async notifyRecharge(data) {
        if (!this.notificationSettings?.isNotificationEnabled('recharge')) {
            return false;
        }

        const message = this.notificationSettings.formatMessage('recharge', {
            email: data.email,
            amount: data.amount,
            type: data.type,
            txnId: data.transactionId,
            time: new Date().toLocaleString()
        });

        return this.sendMessage(message);
    }

    async notifyNumberPurchase(data) {
        if (!this.notificationSettings?.isNotificationEnabled('numberPurchase')) {
            return false;
        }

        const message = this.notificationSettings.formatMessage('numberPurchase', {
            email: data.email,
            service: data.service,
            server: data.server,
            price: data.price,
            time: new Date().toLocaleString()
        });

        return this.sendMessage(message);
    }

    async notifyOtpReceived(data) {
        if (!this.notificationSettings?.isNotificationEnabled('otpReceived')) {
            return false;
        }

        const message = this.notificationSettings.formatMessage('otpReceived', {
            email: data.email,
            service: data.service,
            server: data.server,
            number: data.number,
            time: new Date().toLocaleString()
        });

        return this.sendMessage(message);
    }

    async notifyNumberCancelled(data) {
        if (!this.notificationSettings?.isNotificationEnabled('numberCancelled')) {
            return false;
        }

        const message = this.notificationSettings.formatMessage('numberCancelled', {
            email: data.email,
            service: data.service,
            server: data.server,
            number: data.number,
            time: new Date().toLocaleString()
        });

        return this.sendMessage(message);
    }

    async notifyUserBlocked(data) {
        if (!this.notificationSettings?.isNotificationEnabled('userBlocked')) {
            return false;
        }

        const message = this.notificationSettings.formatMessage('userBlocked', {
            email: data.email,
            reason: data.reason,
            time: new Date().toLocaleString()
        });

        return this.sendMessage(message);
    }

    async sendSalesReport(data) {
        if (!this.notificationSettings?.shouldSendSalesReport()) {
            return false;
        }

        const serverBreakdown = Object.entries(data.serverSales)
            .map(([server, amount]) => `Server ${server}: ₹${amount}`)
            .join('\n');

        const message = this.notificationSettings.formatMessage('salesReport', {
            startTime: data.startTime.toLocaleString(),
            endTime: data.endTime.toLocaleString(),
            totalAmount: data.totalAmount,
            serverBreakdown,
            totalBalance: data.totalBalance
        });

        const success = await this.sendMessage(message);
        if (success) {
            this.notificationSettings.notifications.salesReport.lastSent = new Date();
            await this.notificationSettings.save();
        }
        return success;
    }
}

export default new TelegramNotifier(); 