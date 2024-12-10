import User from '../models/user.model.js';
import MaintenanceSettings from '../models/maintenanceSettings.model.js';

export const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.query.apikey;
        
        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        // Check maintenance status
        const maintenanceSettings = await MaintenanceSettings.findOne();
        if (maintenanceSettings?.masterMaintenance?.isEnabled) {
            return res.status(503).json({ error: 'under maintenance' });
        }

        // Find user by API key
        const user = await User.findOne({ apiKey });
        if (!user) {
            return res.status(401).json({ error: 'invalid key' });
        }

        // Check if user is blocked
        if (user.isBlocked) {
            return res.status(403).json({ error: 'account blocked' });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('API Key Auth Error:', error);
        res.status(500).json({ error: 'internal server error' });
    }
}; 