import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const rawUser = localStorage.getItem('softvet_erp_user');
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      if (user?.id) {
        config.headers['X-User-Id'] = user.id;
      }
    } catch (error) {
      localStorage.removeItem('softvet_erp_user');
    }
  }
  return config;
});

export const dashboardAPI = {
  getStats: () => api.get('/api/dashboard'),
};

export const productsAPI = {
  getAll: (params) => api.get('/api/products', { params }),
  getOne: (id) => api.get(`/api/products/${id}`),
  create: (data) => api.post('/api/products', data),
  getCategories: () => api.get("/products/categories"),
  update: (id, data) => api.put(`/api/products/${id}`, data),
  delete: (id) => api.delete(`/api/products/${id}`),
};

export const customersAPI = {
  getAll: (params) => api.get('/api/customers', { params }),
  getOne: (id) => api.get(`/api/customers/${id}`),
  create: (data) => api.post('/api/customers', data),
  update: (id, data) => api.put(`/api/customers/${id}`, data),
  delete: (id) => api.delete(`/api/customers/${id}`),
};

export const suppliersAPI = {
  getAll: (params) => api.get('/api/suppliers', { params }),
  getOne: (id) => api.get(`/api/suppliers/${id}`),
  create: (data) => api.post('/api/suppliers', data),
  update: (id, data) => api.put(`/api/suppliers/${id}`, data),
  delete: (id) => api.delete(`/api/suppliers/${id}`),
};

export const salesAPI = {
  getAll: (params) => api.get('/api/sales', { params }),
  getOne: (id) => api.get(`/api/sales/${id}`),
  create: (data) => api.post('/api/sales', data),
};

export const purchasesAPI = {
  getAll: (params) => api.get('/api/purchases', { params }),
  create: (data) => api.post('/api/purchases', data),
  getPurchaseNeedsReport: () => api.get('/api/reports/purchase-needs'),
};

export const stockAPI = {
  getAll: () => api.get('/api/stock'),
  getMovements: (params) => api.get('/api/stock/movements', { params }),
  createMovement: (data) => api.post('/api/stock/movement', data),
};

export const financialAPI = {
  getEntries: (params) => api.get('/api/financial/entries', { params }),
  getPayables: () => api.get('/api/financial/payables'),
  getReceivables: () => api.get('/api/financial/receivables'),
  getCashflow: () => api.get('/api/financial/cashflow'),
  getProfitability: () => api.get('/api/financial/profitability'),
  createEntry: (data) => api.post('/api/financial/entries', data),
  updateEntry: (id, data) => api.put(`/api/financial/entries/${id}`, data),
  settleEntry: (id) => api.put(`/api/financial/entries/${id}/settle`),
  reverseEntry: (id) => api.put(`/api/financial/entries/${id}/reverse`),
};

export const accountingAPI = {
  getAccounts: () => api.get('/api/accounts'),
  createAccount: (data) => api.post('/api/accounts', data),
  updateAccount: (id, data) => api.put(`/api/accounts/${id}`, data),
  deleteAccount: (id) => api.delete(`/api/accounts/${id}`),
  seedDefaultAccounts: () => api.post('/api/accounts/seed-default'),
  getBalanceSheet: () => api.get('/api/accounting/balance-sheet'),
  getIncomeStatement: () => api.get('/api/accounting/income-statement'),
};

export const usersAPI = {
  getAll: () => api.get('/api/users'),
  lookup: () => api.get('/api/users/lookup'),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
};

export const authAPI = {
  login: (data) => api.post('/api/auth/login', data),
};

export const auditAPI = {
  getLogs: (params) => api.get('/api/audit-logs', { params }),
};

export default api;
