const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Create rate limiters for different endpoints
const createLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { 
            success: false, 
            error: message 
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

// Auth rate limiters
exports.loginLimiter = createLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts
    'Too many login attempts. Please try again after 15 minutes.'
);

exports.registerLimiter = createLimiter(
    60 * 60 * 1000, // 1 hour
    3, // 3 attempts
    'Too many registration attempts. Please try again after 1 hour.'
);

exports.otpLimiter = createLimiter(
    5 * 60 * 1000, // 5 minutes
    3, // 3 attempts
    'Too many OTP verification attempts. Please try again after 5 minutes.'
);

// Recharge rate limiters
exports.rechargeLimiter = createLimiter(
    60 * 60 * 1000, // 1 hour
    10, // 10 attempts
    'Too many recharge attempts. Please try again after 1 hour.'
);

// API rate limiters
exports.apiLimiter = createLimiter(
    60 * 1000, // 1 minute
    30, // 30 requests
    'Too many requests. Please try again after 1 minute.'
);

// Global rate limiter
exports.globalLimiter = createLimiter(
    60 * 1000, // 1 minute
    100, // 100 requests
    'Too many requests from this IP. Please try again after 1 minute.'
); 