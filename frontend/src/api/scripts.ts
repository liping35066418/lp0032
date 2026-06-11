import { request, ApiResponse, PaginatedResponse } from './client';

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

  getCategories: (): Promise<ApiResponse<ScriptCategory[]>> =>
    request.get<ScriptCategory[]>('/scripts/categories'),

  getDetail: (id: number): Promise<ApiResponse<Script>> =>
    request.get<Script>(`/scripts/${id}`)
};
