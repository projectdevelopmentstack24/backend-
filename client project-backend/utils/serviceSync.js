import cron from 'node-cron';
import { getServiceList } from './apiIntegration.js';
import ServiceModel from '../models/service.models.js';
import ServerModel from '../models/servers.js';
import telegramNotifier from './telegramNotification.js';

class ServiceSynchronizer {
    constructor() {
        // Schedule daily sync at 12 AM
        cron.schedule('0 0 * * *', () => {
            this.syncServices();
        });
    }

    async syncServices() {
        try {
            console.log('Starting service synchronization...');
            
            // Get all active servers
            const servers = await ServerModel.find({ maintainance: false });
            
            // Collect services from all servers
            const allServices = new Map(); // Map to store service details by name
            
            for (const server of servers) {
                try {
                    const { services } = await getServiceList(server.api_key, server.provider);
                    
                    if (!services) continue;
                    
                    // Process each service
                    for (const [code, details] of Object.entries(services)) {
                        const serviceName = this.normalizeServiceName(details.name || code);
                        
                        if (!allServices.has(serviceName)) {
                            allServices.set(serviceName, {
                                name: serviceName,
                                servers: [],
                                totalServers: 0,
                                averagePrice: 0,
                                totalPrice: 0
                            });
                        }
                        
                        const serviceData = allServices.get(serviceName);
                        serviceData.servers.push({
                            serverId: server.server,
                            code,
                            price: details.price || 0,
                            isActive: true
                        });
                        serviceData.totalServers++;
                        serviceData.totalPrice += details.price || 0;
                        serviceData.averagePrice = serviceData.totalPrice / serviceData.totalServers;
                    }
                } catch (error) {
                    console.error(`Error syncing services for server ${server.server}:`, error);
                    continue;
                }
            }
            
            // Update database
            for (const [serviceName, serviceData] of allServices) {
                try {
                    await ServiceModel.findOneAndUpdate(
                        { name: serviceName },
                        {
                            $set: {
                                name: serviceName,
                                servers: serviceData.servers,
                                averagePrice: serviceData.averagePrice,
                                lastUpdated: new Date()
                            }
                        },
                        { upsert: true, new: true }
                    );
                } catch (error) {
                    console.error(`Error updating service ${serviceName}:`, error);
                }
            }
            
            // Deactivate services not found in any server
            const activeServiceNames = Array.from(allServices.keys());
            await ServiceModel.updateMany(
                { name: { $nin: activeServiceNames } },
                { 
                    $set: { 
                        'servers.$[].isActive': false,
                        lastUpdated: new Date()
                    }
                }
            );
            
            // Send notification
            await this.notifySync(allServices.size);
            
            console.log('Service synchronization completed successfully');
        } catch (error) {
            console.error('Error in service synchronization:', error);
            await this.notifySync(0, error.message);
        }
    }
    
    normalizeServiceName(name) {
        // Remove special characters and normalize spaces
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    async notifySync(serviceCount, error = null) {
        const time = new Date().toLocaleString();
        let message;
        
        if (error) {
            message = `❌ Service Sync Failed\nTime: ${time}\nError: ${error}`;
        } else {
            message = `✅ Service Sync Completed\nTime: ${time}\nTotal Services: ${serviceCount}`;
        }
        
        await telegramNotifier.sendMessage(message);
    }
    
    // Method to manually trigger sync
    async manualSync() {
        await this.syncServices();
    }
}

export default new ServiceSynchronizer(); 