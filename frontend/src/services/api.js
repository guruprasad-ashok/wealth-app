import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.REACT_APP_API_KEY || '', // Send API Key if configured
    },
});

// Portfolio
export const getPortfolioOverview = () => api.get('/portfolio/overview');
export const getAssetDetail = (assetClass) => api.get(`/portfolio/assets/${assetClass}`);
export const getPortfolioPerformance = () => api.get('/portfolio/performance');
export const getHoldings = (assetClass, goal, type) => {
    const params = new URLSearchParams();
    if (assetClass) params.append('assetClass', assetClass);
    if (goal) params.append('goal', goal);
    if (type) params.append('type', type);
    const queryString = params.toString();
    return api.get(`/portfolio/holdings${queryString ? `?${queryString}` : ''}`);
};

// Transactions
export const getTransactions = (page = 1, limit = 50) => api.get(`/transactions?page=${page}&limit=${limit}`);
export const createTransaction = (data) => api.post('/transactions', data);
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);

// Goals
export const getGoals = () => api.get('/goals');
export const createGoal = (data) => api.post('/goals', data);
export const updateGoal = (id, data) => api.put(`/goals/${id}`, data);
export const deleteGoal = (id) => api.delete(`/goals/${id}`);
export const getGoalProgress = (id) => api.get(`/goals/${id}/progress`);

// Analytics
export const getAnalyticsSummary = () => api.get('/analytics/summary');

// Reports
export const exportData = (format = 'json') => api.post('/reports/export', { format });

// Settings
export const getSheetsSettings = () => api.get('/settings/sheets');

// Settings endpoints
export const getSettings = () => api.get('/settings/sheets');

export default api;
