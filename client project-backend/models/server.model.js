const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
    server: {
        type: String,
        required: true,
        unique: true
    },
    provider: {
        type: String,
        required: true,
        enum: ['fastsms', 'fivesim', 'smshub', 'tigersms', 'grizzlysms', 'tempnum', 'smsman']
    },
    api_key: {
        type: String,
        required: true
    },
    maintainance: {
        type: Boolean,
        default: false
    },
    balance: {
        type: Number,
        default: 0
    },
    lastBalanceCheck: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Server', serverSchema); 