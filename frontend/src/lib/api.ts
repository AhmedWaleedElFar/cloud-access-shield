import axios, { AxiosError } from 'axios';
import { API_URL, API_TIMEOUT } from '../config';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 404) {
      console.error('Not found:', error.config?.url);
    } else if (error.response?.status === 500) {
      console.error('Server error:', error.message);
    } else if (error.message === 'Network Error') {
      console.error('Network error — check backend and database');
    }
    return Promise.reject(error);
  },
);

export const api = {
  // Health
  checkHealth: () => apiClient.get('/health'),

  // Users
  getUsers: (limit = 50, offset = 0) =>
    apiClient.get('/api/users', { params: { limit, offset } }),

  searchUsers: (query: string) =>
    apiClient.get('/api/users/search', { params: { q: query } }),

  getUser: (id: string) =>
    apiClient.get(`/api/users/${id}`),

  // Access
  getAccessPaths: (userId: string, depth?: number) =>
    apiClient.get(`/api/access/paths/${userId}`, { params: { depth } }),

  getEscalationPaths: (userId: string) =>
    apiClient.get(`/api/access/escalations/${userId}`),

  revokeAccess: (userId: string, groupId: string) =>
    apiClient.post('/api/access/revoke', { userId, groupId }),

  simulateAccess: (userId: string, groupId: string) =>
    apiClient.post('/api/access/simulate', { userId, groupId }),

  // Analytics
  getDangerousRoles: (limit?: number) =>
    apiClient.get('/api/analytics/dangerous-roles', { params: { limit } }),

  getEscalationSummary: () =>
    apiClient.get('/api/analytics/escalation-summary'),

  getUserStats: () =>
    apiClient.get('/api/analytics/user-stats'),
};
