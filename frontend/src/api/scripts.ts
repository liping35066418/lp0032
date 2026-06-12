import { request, ApiResponse, PaginatedResponse } from './client';
import { Category } from '../types';

export type ScriptDifficulty = 'easy' | 'medium' | 'hard' | 'nightmare';
export type ScriptStatus = 'draft' | 'published' | 'offline';

export interface Script {
  id: number;
  name: string;
  cover_image?: string;
  description?: string;
  category: string;
  difficulty: ScriptDifficulty;
  min_players: number;
  max_players: number;
  duration: number;
  base_price: number;
  status: ScriptStatus;
  tags?: string;
  materials?: string;
  author?: string;
  publisher?: string;
  created_at: string;
  updated_at: string;
}

export interface ScriptCategory {
  name: string;
  count: number;
}

export interface CategoryWithCount extends Category {
  script_count: number;
  published_count: number;
}

export interface ScriptListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  difficulty?: string;
  status?: string;
  keyword?: string;
  minPlayers?: number;
  maxPlayers?: number;
}

export const scriptApi = {
  getList: (params?: ScriptListParams): Promise<ApiResponse<PaginatedResponse<Script>>> =>
    request.get<PaginatedResponse<Script>>('/scripts', { params }),

  getScriptCategories: (): Promise<ApiResponse<ScriptCategory[]>> =>
    request.get<ScriptCategory[]>('/scripts/categories'),

  getCategories: (): Promise<ApiResponse<ScriptCategory[]>> =>
    request.get<ScriptCategory[]>('/categories/active'),

  getAllCategories: (params?: { status?: string }): Promise<ApiResponse<CategoryWithCount[]>> =>
    request.get<CategoryWithCount[]>('/categories', { params }),

  createCategory: (data: { name: string }): Promise<ApiResponse<Category>> =>
    request.post<Category>('/categories', data),

  updateCategory: (id: number, data: { name: string }): Promise<ApiResponse<Category>> =>
    request.put<Category>(`/categories/${id}`, data),

  updateCategoryStatus: (id: number, status: 'active' | 'inactive'): Promise<ApiResponse<{ status: string }>> =>
    request.patch<{ status: string }>(`/categories/${id}/status`, { status }),

  deleteCategory: (id: number): Promise<ApiResponse<null>> =>
    request.delete<null>(`/categories/${id}`),

  getDetail: (id: number): Promise<ApiResponse<Script>> =>
    request.get<Script>(`/scripts/${id}`)
};
