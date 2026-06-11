import { request, ApiResponse } from './client';

export interface DailyStats {
  date: string;
  schedules: DailySchedule[];
  totalSchedules: number;
  totalRevenue: number;
  totalPlayers: number;
}

export interface DailySchedule {
  id: number;
  script_id: number;
  room_id: number;
  host_id: number;
  start_time: string;
  end_time: string;
  status: string;
  current_players: number;
  min_players: number;
  max_players: number;
  is_locked: number;
  script_name: string;
  cover_image?: string;
  room_name: string;
  host_name: string;
  booking_count: number;
  player_count: number;
}

export interface DailyStatsParams {
  date?: string;
}

export const statisticsApi = {
  getDaily: (params?: DailyStatsParams): Promise<ApiResponse<DailyStats>> =>
    request.get<DailyStats>('/statistics/daily', { params })
};
