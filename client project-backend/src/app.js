import express from "express"
import cors from "cors"
import dotenv from 'dotenv'
import dbConnect from "../config/db.js";
import adminRoutes from '../router/admin.js'
import apiRoutes from '../router/api.js'
import { maintenanceCheckMiddleware } from '../middlewares/adminAuth.js'
import serviceSynchronizer from '../utils/serviceSync.js'
import { globalLimiter } from '../middlewares/rateLimit.js'

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json())
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// Apply global rate limiter
app.use(globalLimiter);

// Database connection
dbConnect();

// Environment variables validation
const PORT = process.env.PORT || 3000;
if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
}

// Required environment variables check
const requiredEnvVars = [
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'MAIL_USER',
    'MAIL_PASS',
    'RECAPTCHA_SECRET_KEY',
    'FRONTEND_URL',
    'MAIN_TRX_ADDRESS',
    'UPI_ID',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'CANCEL_TIMEOUT',
    'ORDER_TIMEOUT'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
}

// Maintenance check middleware
app.use(maintenanceCheckMiddleware);

// Health check route
app.get("/", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running" });
});

// Route registration
app.use("/api/admin", adminRoutes);
app.use("/api/v1", apiRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Start service synchronization
serviceSynchronizer.manualSync().catch(error => {
    console.error('Initial service sync error:', error);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});