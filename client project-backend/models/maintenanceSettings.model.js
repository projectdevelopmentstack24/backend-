import mongoose from 'mongoose';

const maintenanceSettingsSchema = new mongoose.Schema({
    masterMaintenance: {
        isEnabled: {
            type: Boolean,
            default: false
        },
        message: {
            type: String,
            default: 'Website is under maintenance. Please try again later.'
        }
    },
    serverMaintenance: [{
        serverId: {
            type: Number,
            required: true
        },
        isEnabled: {
            type: Boolean,
            default: false
        },
        message: {
            type: String,
            default: 'Server is under maintenance.'
        }
    }],
    authMaintenance: {
        login: {
            isEnabled: {
                type: Boolean,
                default: false
            },
            message: {
                type: String,
                default: 'Login is temporarily disabled.'
            }
        },
        signup: {
            isEnabled: {
                type: Boolean,
                default: false
            },
            message: {
                type: String,
                default: 'New registrations are temporarily disabled.'
            }
        }
    },
    rechargeMaintenance: {
        upi: {
            isEnabled: {
                type: Boolean,
                default: false
            },
            message: {
                type: String,
                default: 'UPI recharge is temporarily disabled.'
            }
        },
        trx: {
            isEnabled: {
                type: Boolean,
                default: false
            },
            message: {
                type: String,
                default: 'TRX recharge is temporarily disabled.'
            }
        }
    },
    supportMaintenance: {
        contact: {
            isEnabled: {
                type: Boolean,
                default: false
            },
            message: {
                type: String,
                default: 'Contact support is temporarily unavailable.'
            }
        },
        channel: {
            isEnabled: {
                type: Boolean,
                default: false
            },
            message: {
                type: String,
                default: 'Channel join is temporarily disabled.'
            }
        }
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Method to check if any maintenance mode is active
maintenanceSettingsSchema.methods.isUnderMaintenance = function() {
    if (this.masterMaintenance.isEnabled) return true;
    
    const hasServerMaintenance = this.serverMaintenance.some(server => server.isEnabled);
    if (hasServerMaintenance) return true;
    
    if (this.authMaintenance.login.isEnabled && this.authMaintenance.signup.isEnabled) return true;
    
    if (this.rechargeMaintenance.upi.isEnabled && this.rechargeMaintenance.trx.isEnabled) return true;
    
    return false;
};

// Method to check if specific server is under maintenance
maintenanceSettingsSchema.methods.isServerUnderMaintenance = function(serverId) {
    if (this.masterMaintenance.isEnabled) return true;
    
    const server = this.serverMaintenance.find(s => s.serverId === serverId);
    return server ? server.isEnabled : false;
};

// Method to check if auth is under maintenance
maintenanceSettingsSchema.methods.isAuthUnderMaintenance = function(type) {
    if (this.masterMaintenance.isEnabled) return true;
    
    return this.authMaintenance[type]?.isEnabled || false;
};

// Method to check if recharge is under maintenance
maintenanceSettingsSchema.methods.isRechargeUnderMaintenance = function(type) {
    if (this.masterMaintenance.isEnabled) return true;
    
    return this.rechargeMaintenance[type]?.isEnabled || false;
};

const MaintenanceSettings = mongoose.model('MaintenanceSettings', maintenanceSettingsSchema);

export default MaintenanceSettings; 