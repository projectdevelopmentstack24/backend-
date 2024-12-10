import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(email) {
                // Reject temporary email providers
                const tempEmailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
                const domain = email.split('@')[1];
                return !tempEmailDomains.includes(domain);
            },
            message: 'Temporary email providers are not allowed'
        }
    },
    password: {
        type: String,
        required: function() {
            return !this.googleOAuthId; // Password required only if not using Google OAuth
        }
    },
    userId: {
        type: String,
        unique: true,
        sparse: true
    },
    userIp: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    apiKey: {
        type: String,
        unique: true,
        required: true
    },
    trxAddress: {
        type: String,
        required: true,
        unique: true
    },
    trxPrivateKey: {
        type: String,
        required: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    googleOAuthId: {
        type: String,
        sparse: true,
        unique: true
    },
    blocked: {
        type: Boolean,
        default: false
    },
    blockedReason: {
        type: String,
        default: null
    },
    verificationToken: {
        type: String,
        required: false
    },
    verificationTokenExpiry: {
        type: Date,
        required: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    totalRechargeAmount: {
        type: Number,
        default: 0
    },
    totalServiceAmount: {
        type: Number,
        default: 0
    },
    activeOrders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    rechargeHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RechargeHistory'
    }],
    serviceHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceHistory'
    }]
}, {
    timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Generate API key
UserSchema.pre('save', function(next) {
    if (this.isNew) {
        this.apiKey = this._generateApiKey();
    }
    next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate API key
UserSchema.methods._generateApiKey = function() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}${random}`.toUpperCase();
};

// Method to check balance
UserSchema.methods.hasBalance = function(amount) {
    return this.balance >= amount;
};

// Method to update balance
UserSchema.methods.updateBalance = async function(amount, type = 'add') {
    const newBalance = type === 'add' ? this.balance + amount : this.balance - amount;
    if (newBalance < 0) throw new Error('Insufficient balance');
    
    this.balance = newBalance;
    await this.save();
    return this.balance;
};

// Method to check if user can cancel number
UserSchema.methods.canCancelNumber = function(orderId) {
    return this.activeOrders.includes(orderId);
};

// Method to validate account balance
UserSchema.methods.validateAccountBalance = function() {
    const expectedBalance = this.totalRechargeAmount - this.totalServiceAmount;
    return Math.abs(expectedBalance - this.balance) < 0.01; // Allow for small floating-point differences
};

const User = mongoose.model('User', UserSchema);

export default User;
