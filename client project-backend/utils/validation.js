const TEMP_EMAIL_DOMAINS = [
    'tempmail.com',
    'temp-mail.org',
    'guerrillamail.com',
    'sharklasers.com',
    'mailinator.com',
    'yopmail.com',
    'dispostable.com',
    'maildrop.cc',
    'throwawaymail.com',
    '10minutemail.com'
];

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;
const TRX_ADDRESS_REGEX = /^T[A-Za-z0-9]{33}$/;

// Email validation
exports.isValidEmail = (email) => {
    const domain = email.split('@')[1].toLowerCase();
    return !TEMP_EMAIL_DOMAINS.includes(domain);
};

// Password validation
exports.isValidPassword = (password) => {
    return PASSWORD_REGEX.test(password);
};

// Phone number validation
exports.isValidPhone = (phone) => {
    return PHONE_REGEX.test(phone);
};

// UPI ID validation
exports.isValidUpiId = (upiId) => {
    return UPI_REGEX.test(upiId);
};

// TRX address validation
exports.isValidTrxAddress = (address) => {
    return TRX_ADDRESS_REGEX.test(address);
};

// Transaction validation
exports.isValidTransaction = (transaction) => {
    if (!transaction) return false;
    if (transaction.status === 'completed') return false;
    if (transaction.attempts >= 3) return false;
    
    const now = Date.now();
    const createdAt = new Date(transaction.createdAt).getTime();
    const timeElapsed = now - createdAt;
    
    // Transaction expires after 30 minutes
    if (timeElapsed > 30 * 60 * 1000) return false;
    
    return true;
};

// Amount validation
exports.isValidAmount = (amount, min = 50, max = 10000) => {
    return amount >= min && amount <= max;
};

// Service validation
exports.isValidService = (service) => {
    if (!service) return false;
    if (!service.isActive) return false;
    if (!service.servers || service.servers.length === 0) return false;
    return true;
};

// Error messages
exports.errorMessages = {
    invalidEmail: 'Temporary email addresses are not allowed',
    invalidPassword: 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character',
    invalidPhone: 'Invalid phone number format',
    invalidUpi: 'Invalid UPI ID format',
    invalidTrx: 'Invalid TRX address format',
    invalidAmount: 'Amount must be between ₹50 and ₹10,000',
    invalidTransaction: 'Invalid or expired transaction',
    invalidService: 'Service is not available'
}; 