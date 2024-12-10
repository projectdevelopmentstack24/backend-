const ServiceModel = require('../../models/service.model');
const ServerModel = require('../../models/server.model');
const ServiceSynchronizer = require('../../utils/serviceSync');

// Get all services with optional filtering
exports.getServices = async (req, res) => {
    try {
        const { active, server } = req.query;
        let query = {};

        if (active === 'true') {
            query['servers.isActive'] = true;
        }
        if (server) {
            query['servers.serverId'] = server;
        }

        const services = await ServiceModel.find(query).sort({ name: 1 });
        res.json({ success: true, services });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get service details by name
exports.getServiceByName = async (req, res) => {
    try {
        const service = await ServiceModel.findOne({ name: req.params.name });
        if (!service) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }
        res.json({ success: true, service });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Manually trigger service sync
exports.syncServices = async (req, res) => {
    try {
        await ServiceSynchronizer.manualSync();
        res.json({ success: true, message: 'Service synchronization triggered' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get service statistics
exports.getServiceStats = async (req, res) => {
    try {
        const totalServices = await ServiceModel.countDocuments();
        const activeServices = await ServiceModel.countDocuments({
            'servers.isActive': true
        });
        const totalServers = await ServerModel.countDocuments();
        const activeServers = await ServerModel.countDocuments({
            maintainance: false
        });

        res.json({
            success: true,
            stats: {
                totalServices,
                activeServices,
                totalServers,
                activeServers
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}; 