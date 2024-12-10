const ServerModel = require('../../models/server.model');
const { fastSmsApi, fiveSimApi } = require('../../utils/apiIntegration');

// Get all servers
exports.getServers = async (req, res) => {
    try {
        const servers = await ServerModel.find().sort({ provider: 1, server: 1 });
        res.json({ success: true, servers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Add new server
exports.addServer = async (req, res) => {
    try {
        const { server, provider, api_key } = req.body;

        // Validate provider
        if (!['fastsms', 'fivesim', 'smshub', 'tigersms', 'grizzlysms', 'tempnum', 'smsman'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'Invalid provider' });
        }

        // Check if server already exists
        const existingServer = await ServerModel.findOne({ server });
        if (existingServer) {
            return res.status(400).json({ success: false, error: 'Server already exists' });
        }

        // Check API key validity by getting balance
        let balance = 0;
        try {
            const balanceResponse = provider === 'fastsms' 
                ? await fastSmsApi.getBalance(api_key)
                : await fiveSimApi.getBalance(api_key);
            
            if (balanceResponse.error) {
                return res.status(400).json({ success: false, error: 'Invalid API key' });
            }
            balance = balanceResponse.balance;
        } catch (error) {
            return res.status(400).json({ success: false, error: 'Failed to validate API key' });
        }

        // Create new server
        const newServer = await ServerModel.create({
            server,
            provider,
            api_key,
            balance,
            lastBalanceCheck: new Date()
        });

        res.json({ success: true, server: newServer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update server
exports.updateServer = async (req, res) => {
    try {
        const { server } = req.params;
        const { api_key, maintainance } = req.body;

        const updatedServer = await ServerModel.findOneAndUpdate(
            { server },
            { 
                ...(api_key && { api_key }),
                ...(typeof maintainance === 'boolean' && { maintainance })
            },
            { new: true }
        );

        if (!updatedServer) {
            return res.status(404).json({ success: false, error: 'Server not found' });
        }

        res.json({ success: true, server: updatedServer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete server
exports.deleteServer = async (req, res) => {
    try {
        const { server } = req.params;
        const deletedServer = await ServerModel.findOneAndDelete({ server });

        if (!deletedServer) {
            return res.status(404).json({ success: false, error: 'Server not found' });
        }

        res.json({ success: true, message: 'Server deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Check server balance
exports.checkBalance = async (req, res) => {
    try {
        const { server } = req.params;
        const serverDoc = await ServerModel.findOne({ server });

        if (!serverDoc) {
            return res.status(404).json({ success: false, error: 'Server not found' });
        }

        const balanceResponse = serverDoc.provider === 'fastsms'
            ? await fastSmsApi.getBalance(serverDoc.api_key)
            : await fiveSimApi.getBalance(serverDoc.api_key);

        if (balanceResponse.error) {
            return res.status(400).json({ success: false, error: balanceResponse.error });
        }

        const updatedServer = await ServerModel.findOneAndUpdate(
            { server },
            {
                balance: balanceResponse.balance,
                lastBalanceCheck: new Date()
            },
            { new: true }
        );

        res.json({ success: true, server: updatedServer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}; 