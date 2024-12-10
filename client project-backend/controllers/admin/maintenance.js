import MaintenanceSettings from '../../models/maintenanceSettings.model.js';
import telegramNotifier from '../../utils/telegramNotification.js';

// Helper function to send maintenance notification
const notifyMaintenanceChange = async (type, status, adminEmail) => {
    const message = `🔧 Maintenance Update\nType: ${type}\nStatus: ${status ? 'Enabled' : 'Disabled'}\nBy: ${adminEmail}\nTime: ${new Date().toLocaleString()}`;
    await telegramNotifier.sendMessage(message);
};

export const getMasterMaintenance = async (req, res) => {
    try {
        const settings = await MaintenanceSettings.findOne({});
        if (!settings) {
            return res.status(404).json({ error: 'Maintenance settings not found' });
        }

        res.status(200).json({
            enabled: settings.masterMaintenance.isEnabled,
            message: settings.masterMaintenance.message
        });
    } catch (error) {
        console.error('Get master maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateMasterMaintenance = async (req, res) => {
    try {
        const { isEnabled, message } = req.body;
        const { adminId } = req.admin;

        if (typeof isEnabled !== 'boolean') {
            return res.status(400).json({ error: 'Invalid maintenance status' });
        }

        const settings = await MaintenanceSettings.findOneAndUpdate(
            {},
            {
                $set: {
                    'masterMaintenance.isEnabled': isEnabled,
                    'masterMaintenance.message': message || 'Website is under maintenance. Please try again later.',
                    lastUpdatedBy: adminId
                }
            },
            { new: true, upsert: true }
        );

        await notifyMaintenanceChange('Master', isEnabled, req.admin.email);

        res.status(200).json({
            message: 'Master maintenance updated successfully',
            settings: settings.masterMaintenance
        });
    } catch (error) {
        console.error('Update master maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateServerMaintenance = async (req, res) => {
    try {
        const { serverId, isEnabled, message } = req.body;
        const { adminId } = req.admin;

        if (!serverId || typeof isEnabled !== 'boolean') {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }

        const settings = await MaintenanceSettings.findOne({});
        if (!settings) {
            return res.status(404).json({ error: 'Maintenance settings not found' });
        }

        const serverIndex = settings.serverMaintenance.findIndex(s => s.serverId === serverId);
        if (serverIndex === -1) {
            settings.serverMaintenance.push({
                serverId,
                isEnabled,
                message: message || 'Server is under maintenance.'
            });
        } else {
            settings.serverMaintenance[serverIndex] = {
                serverId,
                isEnabled,
                message: message || 'Server is under maintenance.'
            };
        }

        settings.lastUpdatedBy = adminId;
        await settings.save();

        await notifyMaintenanceChange(`Server ${serverId}`, isEnabled, req.admin.email);

        res.status(200).json({
            message: 'Server maintenance updated successfully',
            server: settings.serverMaintenance.find(s => s.serverId === serverId)
        });
    } catch (error) {
        console.error('Update server maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateAuthMaintenance = async (req, res) => {
    try {
        const { type, isEnabled, message } = req.body;
        const { adminId } = req.admin;

        if (!['login', 'signup'].includes(type) || typeof isEnabled !== 'boolean') {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }

        const settings = await MaintenanceSettings.findOneAndUpdate(
            {},
            {
                $set: {
                    [`authMaintenance.${type}.isEnabled`]: isEnabled,
                    [`authMaintenance.${type}.message`]: message || `${type} is temporarily disabled.`,
                    lastUpdatedBy: adminId
                }
            },
            { new: true, upsert: true }
        );

        await notifyMaintenanceChange(`Auth ${type}`, isEnabled, req.admin.email);

        res.status(200).json({
            message: `${type} maintenance updated successfully`,
            settings: settings.authMaintenance[type]
        });
    } catch (error) {
        console.error('Update auth maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateRechargeMaintenance = async (req, res) => {
    try {
        const { type, isEnabled, message } = req.body;
        const { adminId } = req.admin;

        if (!['upi', 'trx'].includes(type) || typeof isEnabled !== 'boolean') {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }

        const settings = await MaintenanceSettings.findOneAndUpdate(
            {},
            {
                $set: {
                    [`rechargeMaintenance.${type}.isEnabled`]: isEnabled,
                    [`rechargeMaintenance.${type}.message`]: message || `${type.toUpperCase()} recharge is temporarily disabled.`,
                    lastUpdatedBy: adminId
                }
            },
            { new: true, upsert: true }
        );

        await notifyMaintenanceChange(`Recharge ${type.toUpperCase()}`, isEnabled, req.admin.email);

        res.status(200).json({
            message: `${type.toUpperCase()} recharge maintenance updated successfully`,
            settings: settings.rechargeMaintenance[type]
        });
    } catch (error) {
        console.error('Update recharge maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateSupportMaintenance = async (req, res) => {
    try {
        const { type, isEnabled, message } = req.body;
        const { adminId } = req.admin;

        if (!['contact', 'channel'].includes(type) || typeof isEnabled !== 'boolean') {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }

        const settings = await MaintenanceSettings.findOneAndUpdate(
            {},
            {
                $set: {
                    [`supportMaintenance.${type}.isEnabled`]: isEnabled,
                    [`supportMaintenance.${type}.message`]: message || `${type} support is temporarily unavailable.`,
                    lastUpdatedBy: adminId
                }
            },
            { new: true, upsert: true }
        );

        await notifyMaintenanceChange(`Support ${type}`, isEnabled, req.admin.email);

        res.status(200).json({
            message: `${type} support maintenance updated successfully`,
            settings: settings.supportMaintenance[type]
        });
    } catch (error) {
        console.error('Update support maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllMaintenanceSettings = async (req, res) => {
    try {
        const settings = await MaintenanceSettings.findOne({})
            .populate('lastUpdatedBy', 'email');

        if (!settings) {
            return res.status(404).json({ error: 'Maintenance settings not found' });
        }

        res.status(200).json(settings);
    } catch (error) {
        console.error('Get maintenance settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 