import axios from 'axios';

// API configurations for different providers
const API_CONFIGS = {
    fastsms: {
        baseUrl: 'https://fastsms.su/stubs/handler_api.php',
        country: '22'
    },
    fivesim: {
        baseUrl: 'https://5sim.net/v1',
        country: 'india'
    },
    smshub: {
        baseUrl: 'https://smshub.org/stubs/handler_api.php',
        country: '22'
    },
    tigersms: {
        baseUrl: 'https://api.tiger-sms.com/stubs/handler_api.php',
        country: '22'
    },
    grizzlysms: {
        baseUrl: 'https://api.grizzlysms.com/stubs/handler_api.php',
        country: '22'
    },
    tempnum: {
        baseUrl: 'https://tempnum.org/stubs/handler_api.php',
        country: '22'
    },
    smsman: {
        baseUrl: 'https://api2.sms-man.com/control',
        countryId: '14'
    }
};

// Generic function to handle API errors
const handleApiError = (error, provider) => {
    console.error(`Error in ${provider} API:`, error);
    if (error.response) {
        const { status, data } = error.response;
        switch (status) {
            case 400:
                return { error: 'Bad request', details: data };
            case 401:
                return { error: 'Unauthorized', details: 'Invalid API key' };
            case 403:
                return { error: 'Forbidden', details: data };
            case 429:
                return { error: 'Too many requests', details: 'Rate limit exceeded' };
            default:
                return { error: 'API error', details: data };
        }
    }
    return { error: 'Network error', details: error.message };
};

// FastSMS API integration
export const fastSmsApi = {
    async getBalance(apiKey) {
        try {
            const response = await axios.get(`${API_CONFIGS.fastsms.baseUrl}`, {
                params: {
                    api_key: apiKey,
                    action: 'getBalance'
                }
            });
            const balance = response.data.split(':')[1];
            return { balance: parseFloat(balance) };
        } catch (error) {
            return handleApiError(error, 'FastSMS');
        }
    },

    async getNumber(apiKey, service) {
        try {
            const response = await axios.get(`${API_CONFIGS.fastsms.baseUrl}`, {
                params: {
                    api_key: apiKey,
                    action: 'getNumber',
                    service,
                    country: API_CONFIGS.fastsms.country
                }
            });
            
            if (response.data === 'NO_NUMBERS') {
                return { error: 'no stock' };
            }
            if (response.data === 'NO_BALANCE') {
                return { error: 'low balance' };
            }

            const [, id, number] = response.data.split(':');
            return { id, number };
        } catch (error) {
            return handleApiError(error, 'FastSMS');
        }
    },

    async getOtp(apiKey, id) {
        try {
            const response = await axios.get(`${API_CONFIGS.fastsms.baseUrl}`, {
                params: {
                    api_key: apiKey,
                    action: 'getStatus',
                    id
                }
            });

            switch (response.data) {
                case 'STATUS_WAIT_CODE':
                    return { status: 'waiting' };
                case 'STATUS_CANCEL':
                    return { status: 'cancelled' };
                default:
                    if (response.data.startsWith('STATUS_OK:')) {
                        const otp = response.data.split(':')[1];
                        return { status: 'success', otp };
                    }
                    return { error: 'Unknown status' };
            }
        } catch (error) {
            return handleApiError(error, 'FastSMS');
        }
    },

    async cancelNumber(apiKey, id) {
        try {
            const response = await axios.get(`${API_CONFIGS.fastsms.baseUrl}`, {
                params: {
                    api_key: apiKey,
                    action: 'setStatus',
                    status: 8,
                    id
                }
            });

            if (response.data === 'ACCESS_CANCEL') {
                return { status: 'success' };
            }
            if (response.data === 'ACCESS_CANCEL_ALREADY') {
                return { error: 'already cancelled' };
            }
            if (response.data === 'ACCESS_APPROVED') {
                return { error: 'otp already come' };
            }

            return { error: 'Unknown error' };
        } catch (error) {
            return handleApiError(error, 'FastSMS');
        }
    }
};

// 5sim API integration
export const fiveSimApi = {
    async getBalance(token) {
        try {
            const response = await axios.get(`${API_CONFIGS.fivesim.baseUrl}/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            return { balance: response.data.balance };
        } catch (error) {
            return handleApiError(error, '5sim');
        }
    },

    async getNumber(token, service) {
        try {
            const response = await axios.get(
                `${API_CONFIGS.fivesim.baseUrl}/user/buy/activation/${API_CONFIGS.fivesim.country}/virtual21/${service}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );

            return {
                id: response.data.id,
                number: response.data.phone.replace('+', '')
            };
        } catch (error) {
            const errorResponse = error.response?.data;
            if (errorResponse?.includes('no free phones')) {
                return { error: 'no stock' };
            }
            if (errorResponse?.includes('not enough user balance')) {
                return { error: 'low balance' };
            }
            return handleApiError(error, '5sim');
        }
    },

    async getOtp(token, id) {
        try {
            const response = await axios.get(
                `${API_CONFIGS.fivesim.baseUrl}/user/check/${id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (response.data.sms && response.data.sms.length > 0) {
                return {
                    status: 'success',
                    otp: response.data.sms[0].text
                };
            }

            return { status: 'waiting' };
        } catch (error) {
            return handleApiError(error, '5sim');
        }
    },

    async cancelNumber(token, id) {
        try {
            const response = await axios.get(
                `${API_CONFIGS.fivesim.baseUrl}/user/cancel/${id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (response.data.status === 'CANCELED') {
                return { status: 'success' };
            }

            return { error: 'Failed to cancel' };
        } catch (error) {
            const errorResponse = error.response?.data;
            if (errorResponse?.includes('order has sms')) {
                return { error: 'otp already come' };
            }
            if (errorResponse?.includes('order not found')) {
                return { error: 'already cancelled' };
            }
            return handleApiError(error, '5sim');
        }
    }
};

// Add other API integrations similarly...

// Utility function to check SMS format
export const checkSmsFormat = async (apiKey, smsText) => {
    try {
        const response = await axios.get(`${API_CONFIGS.fastsms.baseUrl}`, {
            params: {
                api_key: apiKey,
                action: 'getOtp',
                sms: smsText
            }
        });

        if (Array.isArray(response.data) && response.data.length === 2) {
            const [serviceCode, otp] = response.data;
            return { serviceCode, otp };
        }

        return { error: 'Invalid SMS format' };
    } catch (error) {
        return handleApiError(error, 'SMS Format Check');
    }
};

// Utility function to get service list
export const getServiceList = async (apiKey, provider) => {
    try {
        const config = API_CONFIGS[provider];
        if (!config) {
            return { error: 'Invalid provider' };
        }

        const response = await axios.get(`${config.baseUrl}`, {
            params: {
                api_key: apiKey,
                action: 'getServices'
            }
        });

        return { services: response.data };
    } catch (error) {
        return handleApiError(error, `${provider} Service List`);
    }
}; 