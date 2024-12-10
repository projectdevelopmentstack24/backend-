const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    servers: [{
        serverId: String,
        code: String,
        price: Number,
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    averagePrice: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema); 