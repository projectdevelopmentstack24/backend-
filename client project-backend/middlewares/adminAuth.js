import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';
import MaintenanceSettings from '../models/maintenanceSettings.model.js';

export const adminAuthMiddleware = async (req, res, next) => {
    try {
        // Check for token in headers
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.adminId) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Get admin from database
        const admin = await Admin.findById(decoded.adminId);
        if (!admin) {
            return res.status(401).json({ error: 'Admin not found' });
        }

        // Check if account is locked
        if (admin.isLocked && admin.lockUntil > new Date()) {
            return res.status(403).json({
                error: 'Account is locked. Please try again later.'
            });
        }

        // Add admin to request object
        req.admin = {
            adminId: admin._id,
            email: admin.email
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error('Admin auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const maintenanceCheckMiddleware = async (req, res, next) => {
    try {
        // Skip maintenance check for admin routes
        if (req.path.startsWith('/api/admin')) {
            return next();
        }

        const settings = await MaintenanceSettings.findOne({});
        if (!settings) {
            return next();
        }

        // Check master maintenance
        if (settings.masterMaintenance.isEnabled) {
            return res.status(503).json({
                error: 'maintenance',
                message: settings.masterMaintenance.message
            });
        }

        // Check specific maintenance based on route
        if (req.path.startsWith('/api/auth')) {
            const type = req.path.includes('login') ? 'login' : 'signup';
            if (settings.authMaintenance[type]?.isEnabled) {
                return res.status(503).json({
                    error: 'maintenance',
                    message: settings.authMaintenance[type].message
                });
            }
        }

        if (req.path.startsWith('/api/recharge')) {
            const type = req.path.includes('upi') ? 'upi' : 'trx';
            if (settings.rechargeMaintenance[type]?.isEnabled) {
                return res.status(503).json({
                    error: 'maintenance',
                    message: settings.rechargeMaintenance[type].message
                });
            }
        }

        if (req.path.startsWith('/api/support')) {
            const type = req.path.includes('contact') ? 'contact' : 'channel';
            if (settings.supportMaintenance[type]?.isEnabled) {
                return res.status(503).json({
                    error: 'maintenance',
                    message: settings.supportMaintenance[type].message
                });
            }
        }

        // Check server maintenance if server parameter is present
        const serverId = req.query.server || req.body.server;
        if (serverId) {
            const server = settings.serverMaintenance.find(s => s.serverId === parseInt(serverId));
            if (server?.isEnabled) {
                return res.status(503).json({
                    error: 'maintenance',
                    message: server.message
                });
            }
        }

        next();
    } catch (error) {
        console.error('Maintenance check middleware error:', error);
        next();
    }
}; 