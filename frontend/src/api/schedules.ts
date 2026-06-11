import { request, ApiResponse, PaginatedResponse } from './client';
import { Script } from './scripts';

export type ScheduleStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Schedule {
  id: number;
  script_id: number;
  room_id: number;
  host_id: number;
  start_time: string;
  end_time: string;
  status: ScheduleStatus;
  current_players: number;
  min_players: number;
  max_players: number;
  is_locked: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleWithDetails extends Schedule {
  script_name: string;
  script_category: string;
  script_difficulty: string;
  script_min_players?: number;
  script_max_players?: number;
  cover_image?: string;
  base_price?: number;
  description?: string;
  room_name: string;
  room_capacity?: number;
  host_name: string;
  host_phone?: string;
  bookings?: BookingWithPlayer[];
}

export interface BookingWithPlayer {
  id: number;
  schedule_id: number;
  player_id: number;
  player_count: number;
  player_names?: string;
  status: string;
  booked_at: string;
  checked_in_at?: string;
  player_name: string;
  player_phone: string;
  player_avatar?: string;
}

export interface ScheduleListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  script_id?: number;
  room_id?: number;
  host_id?: number;
  start_date?: string;
  end_date?: string;
  include_bookings?: boolean;
}

export interface AvailableScheduleParams {
  page?: number;
  pageSize?: number;
  script_id?: number;
  date?: string;
  category?: string;
  difficulty?: string;
}

export interface BookScheduleData {
  player_count: number;
  player_names?: string;
}

export interface EndScheduleData {
  actual_players?: number;
  host_rating?: number;
  host_comment?: string;
}

export const scheduleApi = {
  getList: (params?: ScheduleListParams): Promise<ApiResponse<PaginatedResponse<ScheduleWithDetails>>> =>
    request.get<PaginatedResponse<ScheduleWithDetails>>('/schedules', { params }),

  getAvailable: (params?: AvailableScheduleParams): Promise<ApiResponse<PaginatedResponse<ScheduleWithDetails>>> =>
    request.get<PaginatedResponse<ScheduleWithDetails>>('/schedules/available', { params }),

  getDetail: (id: number): Promise<ApiResponse<ScheduleWithDetails>> =>
    request.get<ScheduleWithDetails>(`/schedules/${id}`),

  book: (id: number, data: BookScheduleData): Promise<ApiResponse<any>> =>
    request.post<any>(`/schedules/${id}/book`, data),

  start: (id: number): Promise<ApiResponse<null>> =>
    request.post<null>(`/schedules/${id}/start`),

  end: (id: number, data?: EndScheduleData): Promise<ApiResponse<null>> =>
    request.post<null>(`/schedules/${id}/end`, data),

  cancel: (id: number): Promise<ApiResponse<null>> =>
    request.post<null>(`/schedules/${id}/cancel`)
};
