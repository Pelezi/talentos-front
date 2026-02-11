import apiClient from '@/lib/apiClient';
import { User } from '@/types';

export interface ApiKey {
  id: number;
  name: string;
  keyPreview: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKeyCreated {
  id: number;
  key: string;
  name: string;
  createdAt: string;
}

export const userService = {
  async register(data: { email: string; firstName: string; lastName: string; password: string }): Promise<User> {
    const response = await apiClient.post('/users/register', data);
    return response.data;
  },

  async updateProfile(data: { timezone?: string; phoneNumber?: string; defaultHomepage?: string }): Promise<User> {
    const response = await apiClient.patch('/users/profile', data);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  async createApiKey(name: string): Promise<ApiKeyCreated> {
    const response = await apiClient.post('/users/api-keys', { name });
    return response.data;
  },

  async listApiKeys(): Promise<ApiKey[]> {
    const response = await apiClient.get('/users/api-keys');
    return response.data;
  },

  async deleteApiKey(id: number): Promise<void> {
    await apiClient.delete(`/users/api-keys/${id}`);
  }
};
