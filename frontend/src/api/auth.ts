import { request, ApiResponse } from './client';
import type { User } from '../types';

export type { User };

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'player';
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: (data: LoginData): Promise<ApiResponse<LoginResponse>> =>
    request.post<LoginResponse>('/auth/login', data),
  
  register: (data: RegisterData): Promise<ApiResponse<LoginResponse>> =>
    request.post<LoginResponse>('/auth/register', data),
  
  getProfile: (): Promise<ApiResponse<User>> =>
    request.get<User>('/auth/profile'),
  
  updateProfile: (data: Partial<User>): Promise<ApiResponse<User>> =>
    request.put<User>('/auth/profile', data),
  
  logout: (): Promise<ApiResponse<null>> =>
    request.post<null>('/auth/logout')
};
