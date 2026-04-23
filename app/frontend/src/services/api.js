import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const dashboardAPI = {
  getStats: () => api.get('/api/dashboard'),
};

export const productsAPI = {
  getAll: (params) => api.get('/api/products', { params }),
  getOne: (id) => api.get(`/api/products/${id}`),
  create: (data) => api.post('/api/products', data),
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
};

export const stockAPI = {
  getAll: () => api.get('/api/stock'),
  getMovements: (params) => api.get('/api/stock/movements', { params }),
  createMovement: (data) => api.post('/api/stock/movement', data),
};

export const financialAPI = {
  getEntries: (params) => api.get('/api/financial/entries', { params }),
  getCashflow: () => api.get('/api/financial/cashflow'),
  createEntry: (data) => api.post('/api/financial/entries', data),
};

export const accountingAPI = {
  getAccounts: () => api.get('/api/accounts'),
  createAccount: (data) => api.post('/api/accounts', data),
};

export const auditAPI = {
  getLogs: (params) => api.get('/api/audit-logs', { params }),
};

export default api;
