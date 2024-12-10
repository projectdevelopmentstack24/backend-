const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const MaintenanceSettings = require('../models/maintenanceSettings.model');
const { generateTrxAddress } = require('../utils/tronHelper');
const { sendVerificationEmail } = require('../utils/emailService');
const { generateOTP, verifyOTP } = require('../utils/otpService');

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check maintenance status
        const maintenance = await MaintenanceSettings.findOne();
        if (maintenance?.authMaintenance?.login?.isEnabled) {
            return res.status(503).json({
                success: false,
                error: maintenance.authMaintenance.login.message
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if email is verified
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                error: 'Email not verified',
                requiresVerification: true
            });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Register user
exports.register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check maintenance status
        const maintenance = await MaintenanceSettings.findOne();
        if (maintenance?.authMaintenance?.signup?.isEnabled) {
            return res.status(503).json({
                success: false,
                error: maintenance.authMaintenance.signup.message
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Generate TRX address
        const { address, privateKey } = await generateTrxAddress();

        // Create user
        const user = new User({
            email,
            password,
            name,
            trxAddress: address,
            trxPrivateKey: privateKey,
            verificationToken: generateOTP(),
            verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });

        await user.save();

        // Send verification email
        await sendVerificationEmail(email, user.verificationToken);

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please verify your email.',
            userId: user._id
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Verify email
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification token'
            });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Email Verification Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Verify old password
        const isValid = await user.comparePassword(oldPassword);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid current password'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Check OTP
exports.checkOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const isValid = verifyOTP(otp, user.verificationToken);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP'
            });
        }

        res.json({
            success: true,
            valid: true,
            message: 'OTP verified successfully'
        });
    } catch (error) {
        console.error('Check OTP Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get/Update phone number
exports.getNumber = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        user.phoneNumber = phoneNumber;
        await user.save();

        res.json({
            success: true,
            message: 'Phone number updated successfully'
        });
    } catch (error) {
        console.error('Get/Update Number Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Send verification email
exports.sendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Generate new verification token
        user.verificationToken = generateOTP();
        user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        await user.save();

        // Send email
        await sendVerificationEmail(email, user.verificationToken);

        res.json({
            success: true,
            message: 'Verification email sent successfully',
            sent: true
        });
    } catch (error) {
        console.error('Send Verification Email Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}; 