/**
 * Safe Yatra — Admin Dashboard API Client
 * Configured Axios instance with Bearer auth token injection and standard response envelope handling.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: any;
  };
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Bearer JWT
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Unwrap envelope and standardize errors
apiClient.interceptors.response.use(
  (response) => {
    // If standard envelope { success: true, data: ... }
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (response.data.success) {
        return response.data;
      }
      const errPayload = response.data.error || {};
      throw new ApiError(
        errPayload.message || response.data.message || 'API request returned unsuccessful status',
        response.status,
        errPayload.code,
        errPayload.details
      );
    }
    return response.data;
  },
  (error: AxiosError<any>) => {
    if (error.response) {
      const data = error.response.data;
      const status = error.response.status;
      const message =
        data?.error?.message || data?.message || error.message || 'An unexpected API error occurred';
      const code = data?.error?.code || `HTTP_${status}`;
      const details = data?.error?.details || data;

      return Promise.reject(new ApiError(message, status, code, details));
    }

    if (error.request) {
      return Promise.reject(
        new ApiError('Unable to connect to Safe Yatra server. Please check network connection.', 0, 'NETWORK_ERROR')
      );
    }

    return Promise.reject(new ApiError(error.message, 500, 'REQUEST_SETUP_ERROR'));
  }
);
