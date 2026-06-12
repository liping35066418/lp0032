import { request, ApiResponse, PaginatedResponse } from './client';

export interface Drink {
  id: number;
  name: string;
  category?: string;
  price: number;
  image?: string;
  description?: string;
  status: 'active' | 'inactive';
  stock: number;
  created_at: string;
}

export interface DrinkListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: 'active' | 'inactive' | 'all';
  keyword?: string;
}

export const drinkApi = {
  getList: (params?: DrinkListParams): Promise<ApiResponse<PaginatedResponse<Drink>>> =>
    request.get<PaginatedResponse<Drink>>('/drinks', { params }),

  getCategories: (): Promise<ApiResponse<{ name: string; count: number }[]>> =>
    request.get<{ name: string; count: number }[]>('/drinks/categories'),

  getDetail: (id: number): Promise<ApiResponse<Drink>> =>
    request.get<Drink>(`/drinks/${id}`)
};
