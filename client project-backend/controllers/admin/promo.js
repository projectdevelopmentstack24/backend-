import PromoCode from '../../models/promoCode.model.js';
import telegramNotifier from '../../utils/telegramNotification.js';

// Helper function to send promo notification
const notifyPromoChange = async (action, code, adminEmail) => {
    const message = `🎁 Promo Code ${action}\nCode: ${code}\nBy: ${adminEmail}\nTime: ${new Date().toLocaleString()}`;
    await telegramNotifier.sendMessage(message);
};

export const createPromoCode = async (req, res) => {
    try {
        const {
            code,
            type,
            value,
            minRechargeAmount,
            maxBonusAmount,
            startDate,
            endDate,
            usageLimit,
            description
        } = req.body;

        // Validate input
        if (!code || !type || !value || !minRechargeAmount || !maxBonusAmount || 
            !startDate || !endDate || !usageLimit || !description) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if promo code already exists
        const existingPromo = await PromoCode.findOne({ code });
        if (existingPromo) {
            return res.status(400).json({ error: 'Promo code already exists' });
        }

        // Create new promo code
        const promoCode = new PromoCode({
            code: code.toUpperCase(),
            type,
            value,
            minRechargeAmount,
            maxBonusAmount,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            usageLimit,
            description
        });

        await promoCode.save();
        await notifyPromoChange('Created', code, req.admin.email);

        res.status(201).json({
            message: 'Promo code created successfully',
            promoCode
        });
    } catch (error) {
        console.error('Create promo code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updatePromoCode = async (req, res) => {
    try {
        const { code } = req.params;
        const updateData = req.body;

        // Find and update promo code
        const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });
        if (!promoCode) {
            return res.status(404).json({ error: 'Promo code not found' });
        }

        // Update fields
        Object.keys(updateData).forEach(key => {
            if (key === 'startDate' || key === 'endDate') {
                promoCode[key] = new Date(updateData[key]);
            } else {
                promoCode[key] = updateData[key];
            }
        });

        await promoCode.save();
        await notifyPromoChange('Updated', code, req.admin.email);

        res.status(200).json({
            message: 'Promo code updated successfully',
            promoCode
        });
    } catch (error) {
        console.error('Update promo code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deletePromoCode = async (req, res) => {
    try {
        const { code } = req.params;

        const promoCode = await PromoCode.findOneAndDelete({ code: code.toUpperCase() });
        if (!promoCode) {
            return res.status(404).json({ error: 'Promo code not found' });
        }

        await notifyPromoChange('Deleted', code, req.admin.email);

        res.status(200).json({
            message: 'Promo code deleted successfully'
        });
    } catch (error) {
        console.error('Delete promo code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPromoCode = async (req, res) => {
    try {
        const { code } = req.params;

        const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });
        if (!promoCode) {
            return res.status(404).json({ error: 'Promo code not found' });
        }

        res.status(200).json(promoCode);
    } catch (error) {
        console.error('Get promo code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllPromoCodes = async (req, res) => {
    try {
        const { status, sort } = req.query;
        const query = {};

        // Filter by status
        if (status === 'active') {
            query.isActive = true;
            query.endDate = { $gt: new Date() };
            query.currentUsage = { $lt: '$usageLimit' };
        } else if (status === 'expired') {
            query.$or = [
                { endDate: { $lte: new Date() } },
                { currentUsage: { $gte: '$usageLimit' } },
                { isActive: false }
            ];
        }

        // Sort options
        const sortOptions = {};
        if (sort === 'newest') {
            sortOptions.createdAt = -1;
        } else if (sort === 'oldest') {
            sortOptions.createdAt = 1;
        }

        const promoCodes = await PromoCode.find(query)
            .sort(sortOptions)
            .populate('usedBy.userId', 'email');

        res.status(200).json(promoCodes);
    } catch (error) {
        console.error('Get all promo codes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const togglePromoCode = async (req, res) => {
    try {
        const { code } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });
        if (!promoCode) {
            return res.status(404).json({ error: 'Promo code not found' });
        }

        promoCode.isActive = isActive;
        await promoCode.save();

        await notifyPromoChange(isActive ? 'Activated' : 'Deactivated', code, req.admin.email);

        res.status(200).json({
            message: `Promo code ${isActive ? 'activated' : 'deactivated'} successfully`,
            promoCode
        });
    } catch (error) {
        console.error('Toggle promo code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPromoCodeStats = async (req, res) => {
    try {
        const { code } = req.params;

        const promoCode = await PromoCode.findOne({ code: code.toUpperCase() })
            .populate('usedBy.userId', 'email');

        if (!promoCode) {
            return res.status(404).json({ error: 'Promo code not found' });
        }

        const stats = {
            totalUsage: promoCode.currentUsage,
            remainingUsage: promoCode.usageLimit - promoCode.currentUsage,
            totalBonusGiven: promoCode.usedBy.reduce((sum, use) => sum + use.bonusAmount, 0),
            averageBonusPerUse: promoCode.currentUsage > 0 
                ? promoCode.usedBy.reduce((sum, use) => sum + use.bonusAmount, 0) / promoCode.currentUsage 
                : 0,
            usageHistory: promoCode.usedBy.map(use => ({
                email: use.userId.email,
                rechargeAmount: use.rechargeAmount,
                bonusAmount: use.bonusAmount,
                usedAt: use.usedAt
            }))
        };

        res.status(200).json(stats);
    } catch (error) {
        console.error('Get promo code stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 