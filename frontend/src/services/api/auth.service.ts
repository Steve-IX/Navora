import { apiClient } from './client';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string | null;
    isGuest?: boolean;
  };
}

export const authService = {
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await apiClient.instance.post<AuthResponse>('/auth/register', data);
    apiClient.setAuthToken(response.data.access_token);
    return response.data;
  },

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await apiClient.instance.post<AuthResponse>('/auth/login', data);
    apiClient.setAuthToken(response.data.access_token);
    return response.data;
  },

  async createGuestToken(): Promise<AuthResponse> {
    const response = await apiClient.instance.post<AuthResponse>('/auth/guest');
    apiClient.setAuthToken(response.data.access_token);
    return response.data;
  },

  async getMe() {
    const response = await apiClient.instance.get('/auth/me');
    return response.data;
  },

  logout() {
    apiClient.setAuthToken(null);
  },
};

