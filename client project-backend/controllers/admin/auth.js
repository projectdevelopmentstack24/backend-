import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import Admin from '../../models/admin.model.js';

// Helper function to generate JWT token
const generateToken = (adminId) => {
    return jwt.sign(
        { adminId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

export const login = async (req, res) => {
    try {
        const { email, password, twoFactorCode } = req.body;

        // Validate input
        if (!email || !password || !twoFactorCode) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Find admin
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if account is locked
        if (admin.isLocked && admin.lockUntil > new Date()) {
            return res.status(403).json({
                error: 'Account is locked. Please try again later.'
            });
        }

        // Verify password
        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            await admin.incrementLoginAttempts();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify 2FA code
        const isValidToken = authenticator.verify({
            token: twoFactorCode,
            secret: admin.twoFactorSecret
        });

        if (!isValidToken) {
            await admin.incrementLoginAttempts();
            return res.status(401).json({ error: 'Invalid 2FA code' });
        }

        // Reset login attempts on successful login
        admin.loginAttempts = 0;
        admin.isLocked = false;
        admin.lockUntil = null;
        admin.lastLogin = new Date();
        await admin.save();

        // Generate token
        const token = generateToken(admin._id);

        res.status(200).json({
            message: 'Login successful',
            token
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const setup2FA = async (req, res) => {
    try {
        const { adminId } = req.admin; // From auth middleware

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        // Generate new secret
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(
            admin.email,
            'Virtual Number Admin',
            secret
        );

        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        // Save secret
        admin.twoFactorSecret = secret;
        await admin.save();

        res.status(200).json({
            message: '2FA setup initiated',
            qrCode: qrCodeUrl,
            secret
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const verify2FA = async (req, res) => {
    try {
        const { adminId } = req.admin; // From auth middleware
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Verification code is required' });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const isValidToken = authenticator.verify({
            token: code,
            secret: admin.twoFactorSecret
        });

        if (!isValidToken) {
            return res.status(401).json({ error: 'Invalid verification code' });
        }

        admin.twoFactorEnabled = true;
        await admin.save();

        res.status(200).json({ message: '2FA verification successful' });
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const disable2FA = async (req, res) => {
    try {
        const { adminId } = req.admin; // From auth middleware
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Verification code is required' });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const isValidToken = authenticator.verify({
            token: code,
            secret: admin.twoFactorSecret
        });

        if (!isValidToken) {
            return res.status(401).json({ error: 'Invalid verification code' });
        }

        admin.twoFactorEnabled = false;
        admin.twoFactorSecret = null;
        await admin.save();

        res.status(200).json({ message: '2FA disabled successfully' });
    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { adminId } = req.admin; // From auth middleware
        const { currentPassword, newPassword, code } = req.body;

        if (!currentPassword || !newPassword || !code) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        // Verify current password
        const isPasswordValid = await admin.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Verify 2FA code
        const isValidToken = authenticator.verify({
            token: code,
            secret: admin.twoFactorSecret
        });

        if (!isValidToken) {
            return res.status(401).json({ error: 'Invalid 2FA code' });
        }

        // Update password
        admin.password = newPassword;
        await admin.save();

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 