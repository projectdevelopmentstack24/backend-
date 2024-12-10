const MaintenanceSettings = require('../models/maintenanceSettings.model');

// Get system status
exports.getSystemStatus = async (req, res) => {
    try {
        const maintenance = await MaintenanceSettings.findOne();
        
        const status = {
            status: 'operational',
            maintenance: false,
            message: 'All systems operational'
        };

        if (maintenance?.masterMaintenance?.isEnabled) {
            status.status = 'maintenance';
            status.maintenance = true;
            status.message = maintenance.masterMaintenance.message;
        }

        // Check subsystems
        const subsystems = {
            auth: !maintenance?.authMaintenance?.login?.isEnabled && !maintenance?.authMaintenance?.signup?.isEnabled,
            recharge: !maintenance?.rechargeMaintenance?.upi?.isEnabled && !maintenance?.rechargeMaintenance?.trx?.isEnabled,
            support: !maintenance?.supportMaintenance?.contact?.isEnabled && !maintenance?.supportMaintenance?.channel?.isEnabled
        };

        if (Object.values(subsystems).some(status => !status)) {
            status.status = 'partial';
            status.message = 'Some services are under maintenance';
        }

        res.json({
            success: true,
            ...status,
            subsystems
        });
    } catch (error) {
        console.error('Get System Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get maintenance status
exports.getMaintenanceStatus = async (req, res) => {
    try {
        const maintenance = await MaintenanceSettings.findOne();
        
        const status = {
            maintenance: false,
            message: 'System is operational',
            estimatedDowntime: null
        };

        if (maintenance?.masterMaintenance?.isEnabled) {
            status.maintenance = true;
            status.message = maintenance.masterMaintenance.message;
            status.estimatedDowntime = maintenance.masterMaintenance.estimatedDowntime;
        }

        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        console.error('Get Maintenance Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get system configuration
exports.getSystemConfig = async (req, res) => {
    try {
        const maintenance = await MaintenanceSettings.findOne();
        
        const config = {
            minAmount: parseInt(process.env.MIN_RECHARGE_AMOUNT) || 50,
            maxAmount: parseInt(process.env.MAX_RECHARGE_AMOUNT) || 10000,
            supportedCurrencies: ['INR', 'TRX'],
            features: {
                upiEnabled: !maintenance?.rechargeMaintenance?.upi?.isEnabled,
                tronEnabled: !maintenance?.rechargeMaintenance?.trx?.isEnabled,
                googleAuthEnabled: true,
                emailAuthEnabled: !maintenance?.authMaintenance?.login?.isEnabled,
                registrationEnabled: !maintenance?.authMaintenance?.signup?.isEnabled,
                supportEnabled: !maintenance?.supportMaintenance?.contact?.isEnabled,
                channelEnabled: !maintenance?.supportMaintenance?.channel?.isEnabled
            },
            timeouts: {
                cancelTimeout: parseInt(process.env.CANCEL_TIMEOUT) || 120000,
                orderTimeout: parseInt(process.env.ORDER_TIMEOUT) || 1200000
            }
        };

        res.json({
            success: true,
            config
        });
    } catch (error) {
        console.error('Get System Config Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}; 