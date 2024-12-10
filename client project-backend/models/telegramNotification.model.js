import mongoose from 'mongoose';

const telegramNotificationSchema = new mongoose.Schema({
    botToken: {
        type: String,
        required: true
    },
    chatId: {
        type: String,
        required: true
    },
    notifications: {
        recharge: {
            enabled: {
                type: Boolean,
                default: true
            },
            template: {
                type: String,
                default: '🔵 New Recharge\nUser: {email}\nAmount: ₹{amount}\nType: {type}\nTransaction ID: {txnId}\nTime: {time}'
            }
        },
        numberPurchase: {
            enabled: {
                type: Boolean,
                default: true
            },
            template: {
                type: String,
                default: '🟢 New Number Purchase\nUser: {email}\nService: {service}\nServer: {server}\nPrice: ₹{price}\nTime: {time}'
            }
        },
        otpReceived: {
            enabled: {
                type: Boolean,
                default: true
            },
            template: {
                type: String,
                default: '📱 OTP Received\nUser: {email}\nService: {service}\nServer: {server}\nNumber: {number}\nTime: {time}'
            }
        },
        numberCancelled: {
            enabled: {
                type: Boolean,
                default: true
            },
            template: {
                type: String,
                default: '🔴 Number Cancelled\nUser: {email}\nService: {service}\nServer: {server}\nNumber: {number}\nTime: {time}'
            }
        },
        userBlocked: {
            enabled: {
                type: Boolean,
                default: true
            },
            template: {
                type: String,
                default: '⛔ User Blocked\nUser: {email}\nReason: {reason}\nTime: {time}'
            }
        },
        salesReport: {
            enabled: {
                type: Boolean,
                default: true
            },
            template: {
                type: String,
                default: '📊 Sales Report ({startTime} - {endTime})\n\nTotal Sales: ₹{totalAmount}\n\nServer-wise Breakdown:\n{serverBreakdown}\n\nTotal Balance: ₹{totalBalance}'
            },
            interval: {
                type: Number,
                default: 30, // minutes
                min: 15,
                max: 1440
            },
            lastSent: {
                type: Date,
                default: null
            }
        }
    },
    isEnabled: {
        type: Boolean,
        default: true
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Method to format and send notification
telegramNotificationSchema.methods.formatMessage = function(type, data) {
    const template = this.notifications[type]?.template;
    if (!template) return null;

    let message = template;
    for (const [key, value] of Object.entries(data)) {
        message = message.replace(`{${key}}`, value);
    }
    return message;
};

// Method to check if notification type is enabled
telegramNotificationSchema.methods.isNotificationEnabled = function(type) {
    return this.isEnabled && this.notifications[type]?.enabled;
};

// Method to check if sales report should be sent
telegramNotificationSchema.methods.shouldSendSalesReport = function() {
    if (!this.isEnabled || !this.notifications.salesReport.enabled) return false;
    
    const lastSent = this.notifications.salesReport.lastSent;
    if (!lastSent) return true;
    
    const interval = this.notifications.salesReport.interval;
    const nextSendTime = new Date(lastSent.getTime() + interval * 60 * 1000);
    return Date.now() >= nextSendTime;
};

const TelegramNotification = mongoose.model('TelegramNotification', telegramNotificationSchema);

export default TelegramNotification; 