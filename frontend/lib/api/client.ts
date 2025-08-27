import { getSession } from './auth';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api';

export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiClient {
  private static instance: ApiClient;
  
  private constructor() {}
  
  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }
  
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const session = getSession();
    if (session?.access) {
      headers['Authorization'] = `Bearer ${session.access}`;
    }
    
    return headers;
  }
  
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers = await this.getHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'An error occurred',
      }));
      throw error;
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }
    
    return response.json();
  }
  
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
  
  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const session = getSession();
    const headers: HeadersInit = {};
    
    if (session?.access) {
      headers['Authorization'] = `Bearer ${session.access}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'An error occurred',
      }));
      throw error;
    }
    
    return response.json();
  }
}

export const apiClient = ApiClient.getInstance();