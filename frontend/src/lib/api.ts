import axios, { AxiosError } from 'axios';
import { API_URL, API_TIMEOUT } from '../config';
import type { RevokeRequest, RevokeResult, SimulateRequest, SimulateResult } from '@shared/types';

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
  checkHealth: () => apiClient.get('/health'),

  getUsers: () =>
    apiClient.get('/api/users'),

  searchUsers: (query: string) =>
    apiClient.get('/api/users/search', { params: { q: query } }),

  getUser: (id: string) =>
    apiClient.get(`/api/users/${id}`),

  getUserStats: () =>
    apiClient.get('/api/users/stats'),

  getUserPaths: (userId: string, depth?: number) =>
    apiClient.get(`/api/users/${userId}/paths`, { params: { depth } }),

  getUserEscalation: (userId: string) =>
    apiClient.get(`/api/users/${userId}/escalation`),

  getUserRoles: (userId: string) =>
    apiClient.get(`/api/users/${userId}/roles`),

  getRoles: () =>
    apiClient.get('/api/users/roles/all'),

  getEscalations: () =>
    apiClient.get('/api/analytics/escalations'),

  getCycles: () =>
    apiClient.get('/api/analytics/cycles'),

  getForbidden: () =>
    apiClient.get('/api/analytics/forbidden'),

  analyzeEscalation: (userId: string) =>
    apiClient.post('/api/analyze/escalation', { userId }),

  analyzeBatch: (userIds: string[]) =>
    apiClient.post('/api/analyze/escalation', { userIds }),

  revokeAccess: (req: RevokeRequest) =>
    apiClient.post<RevokeResult>('/api/access/revoke', req),

  simulateRevoke: (req: SimulateRequest) =>
    apiClient.post<SimulateResult>('/api/access/simulate', req),
};
