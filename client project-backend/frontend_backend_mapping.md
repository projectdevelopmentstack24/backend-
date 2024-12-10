# Frontend-Backend API Endpoint Mapping

# Frontend-Backend API Endpoint Mapping

## Authentication Endpoints

### POST /api/auth/login
- Purpose: User login
- Request Body: {
  "email": "string",
  "password": "string"
}
- Response: {
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string"
  }
}

### POST /api/auth/register
- Purpose: User registration
- Request Body: {
  "email": "string",
  "password": "string",
  "name": "string"
}
- Response: {
  "message": "string",
  "userId": "string"
}

### POST /api/auth/verify-email
- Purpose: Email verification
- Request Body: {
  "token": "string"
}
- Response: {
  "message": "string"
}

### POST /api/auth/change-password
- Purpose: Change user password
- Request Body: {
  "oldPassword": "string",
  "newPassword": "string"
}
- Response: {
  "message": "string"
}

### POST /api/auth/check-otp
- Purpose: Verify OTP during authentication
- Request Body: {
  "email": "string",
  "otp": "string"
}
- Response: {
  "valid": "boolean",
  "message": "string"
}

### POST /api/auth/get-number
- Purpose: Get or update phone number
- Request Body: {
  "phoneNumber": "string"
}
- Response: {
  "success": "boolean",
  "message": "string"
}

### POST /api/auth/send-verification-email
- Purpose: Send verification email
- Request Body: {
  "email": "string"
}
- Response: {
  "message": "string",
  "sent": "boolean"
}

## Recharge Endpoints

### POST /api/recharge/initiate
- Purpose: Initiate recharge transaction
- Request Body: {
  "amount": "number",
  "paymentMethod": "string",
  "userId": "string"
}
- Response: {
  "transactionId": "string",
  "status": "string",
  "paymentUrl": "string"
}

### GET /api/recharge/history
- Purpose: Get user's recharge history
- Query Parameters: {
  "userId": "string",
  "page": "number",
  "limit": "number"
}
- Response: {
  "transactions": [{
    "id": "string",
    "amount": "number",
    "status": "string",
    "date": "string",
    "paymentMethod": "string"
  }],
  "totalCount": "number"
}

### GET /api/recharge/verify/:transactionId
- Purpose: Verify recharge transaction status
- Path Parameters: {
  "transactionId": "string"
}
- Response: {
  "status": "string",
  "message": "string",
  "details": {
    "amount": "number",
    "paymentMethod": "string",
    "timestamp": "string"
  }
}

### GET /api/recharge/status/:transactionId
- Purpose: Get current status of recharge
- Path Parameters: {
  "transactionId": "string"
}
- Response: {
  "status": "string",
  "details": {
    "amount": "number",
    "timestamp": "string",
    "method": "string"
  }
}

## User Profile Endpoints

### GET /api/user/profile
- Purpose: Get user profile information
- Headers: {
  "Authorization": "Bearer token"
}
- Response: {
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "balance": "number",
    "verified": "boolean"
  }
}

### PUT /api/user/profile
- Purpose: Update user profile
- Request Body: {
  "name": "string",
  "email": "string"
}
- Response: {
  "message": "string",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}

### GET /api/user/balance
- Purpose: Get user's current balance
- Headers: {
  "Authorization": "Bearer token"
}
- Response: {
  "balance": "number",
  "currency": "string"
}

## Payment Method Endpoints

### POST /api/payment/upi
- Purpose: Process UPI payment
- Request Body: {
  "amount": "number",
  "upiId": "string",
  "purpose": "string"
}
- Response: {
  "transactionId": "string",
  "status": "string",
  "upiUrl": "string"
}

### POST /api/payment/tron
- Purpose: Process TRON payment
- Request Body: {
  "amount": "number",
  "walletAddress": "string"
}
- Response: {
  "transactionId": "string",
  "status": "string",
  "walletDetails": {
    "address": "string",
    "amount": "number",
    "network": "string"
  }
}

### GET /api/payment/methods
- Purpose: Get available payment methods
- Response: {
  "methods": [{
    "id": "string",
    "name": "string",
    "type": "string",
    "enabled": "boolean"
  }]
}

### POST /api/payment/verify-upi
- Purpose: Verify UPI ID
- Request Body: {
  "upiId": "string"
}
- Response: {
  "valid": "boolean",
  "name": "string"
}

## Maintenance Endpoints

### GET /api/system/status
- Purpose: Check system maintenance status
- Response: {
  "status": "string",
  "maintenance": "boolean",
  "message": "string"
}

### GET /api/system/maintenance
- Purpose: Check if system is under maintenance
- Response: {
  "maintenance": "boolean",
  "message": "string",
  "estimatedDowntime": "string"
}

### GET /api/system/config
- Purpose: Get system configuration
- Response: {
  "minAmount": "number",
  "maxAmount": "number",
  "supportedCurrencies": ["string"],
  "features": {
    "upiEnabled": "boolean",
    "tronEnabled": "boolean"
  }
}

