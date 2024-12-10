import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    type: {
        type: String,
        enum: ['FIXED', 'PERCENTAGE'],
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    minRechargeAmount: {
        type: Number,
        required: true,
        min: 0
    },
    maxBonusAmount: {
        type: Number,
        required: true,
        min: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        required: true,
        min: 1
    },
    currentUsage: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        required: true
    },
    usedBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        usedAt: {
            type: Date,
            default: Date.now
        },
        rechargeAmount: {
            type: Number,
            required: true
        },
        bonusAmount: {
            type: Number,
            required: true
        }
    }]
}, {
    timestamps: true
});

// Method to check if promo code is valid
promoCodeSchema.methods.isValid = function() {
    const now = new Date();
    return this.isActive && 
           now >= this.startDate && 
           now <= this.endDate && 
           this.currentUsage < this.usageLimit;
};

// Method to calculate bonus amount
promoCodeSchema.methods.calculateBonus = function(rechargeAmount) {
    if (!this.isValid() || rechargeAmount < this.minRechargeAmount) {
        return 0;
    }

    let bonus = 0;
    if (this.type === 'FIXED') {
        bonus = this.value;
    } else {
        bonus = (rechargeAmount * this.value) / 100;
    }

    return Math.min(bonus, this.maxBonusAmount);
};

// Method to use promo code
promoCodeSchema.methods.use = async function(userId, rechargeAmount) {
    if (!this.isValid() || rechargeAmount < this.minRechargeAmount) {
        throw new Error('Invalid promo code or recharge amount');
    }

    const bonusAmount = this.calculateBonus(rechargeAmount);
    this.currentUsage += 1;
    this.usedBy.push({
        userId,
        rechargeAmount,
        bonusAmount
    });

    if (this.currentUsage >= this.usageLimit) {
        this.isActive = false;
    }

    await this.save();
    return bonusAmount;
};

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

export default PromoCode; 