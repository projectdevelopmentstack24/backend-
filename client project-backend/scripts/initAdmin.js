import dotenv from 'dotenv';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import Admin from '../models/admin.model.js';
import dbConnect from '../config/db.js';

dotenv.config();

const initializeAdmin = async () => {
    try {
        await dbConnect();

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        if (existingAdmin) {
            console.log('Admin account already exists');
            process.exit(0);
        }

        // Generate 2FA secret
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(
            process.env.ADMIN_EMAIL,
            'Virtual Number Admin',
            secret
        );

        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        // Create admin account
        const admin = new Admin({
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            twoFactorSecret: secret,
            twoFactorEnabled: true
        });

        await admin.save();

        console.log('Admin account created successfully');
        console.log('Email:', process.env.ADMIN_EMAIL);
        console.log('2FA Secret:', secret);
        console.log('2FA QR Code:', qrCodeUrl);
        console.log('\nPlease save the 2FA secret and scan the QR code with your authenticator app');
        console.log('You will need these for logging in to the admin panel');

        process.exit(0);
    } catch (error) {
        console.error('Error initializing admin account:', error);
        process.exit(1);
    }
};

// Run the initialization
initializeAdmin(); 