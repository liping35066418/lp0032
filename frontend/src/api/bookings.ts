import { request, ApiResponse, PaginatedResponse } from './client';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'completed';

export interface Booking {
  id: number;
  schedule_id: number;
  player_id: number;
  player_count: number;
  player_names?: string;
  status: BookingStatus;
  booked_at: string;
  checked_in_at?: string;
}

export interface BookingWithDetails extends Booking {
  start_time: string;
  end_time: string;
  schedule_status: string;
  is_locked?: number;
  script_name: string;
  cover_image?: string;
  category?: string;
  difficulty?: string;
  base_price?: number;
  room_name: string;
  host_name?: string;
  player_name: string;
  player_phone: string;
}

export interface BookingListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  schedule_id?: number;
  player_id?: number;
}

export interface UpdateBookingData {
  player_count?: number;
  player_names?: string;
}

export const bookingApi = {
  getList: (params?: BookingListParams): Promise<ApiResponse<PaginatedResponse<BookingWithDetails>>> =>
    request.get<PaginatedResponse<BookingWithDetails>>('/bookings', { params }),

  getMyBookings: (params?: BookingListParams): Promise<ApiResponse<PaginatedResponse<BookingWithDetails>>> =>
    request.get<PaginatedResponse<BookingWithDetails>>('/bookings/my', { params }),

  getDetail: (id: number): Promise<ApiResponse<BookingWithDetails>> =>
    request.get<BookingWithDetails>(`/bookings/${id}`),

  checkIn: (id: number): Promise<ApiResponse<null>> =>
    request.post<null>(`/bookings/${id}/checkin`),

  cancel: (id: number): Promise<ApiResponse<null>> =>
    request.post<null>(`/bookings/${id}/cancel`),

  update: (id: number, data: UpdateBookingData): Promise<ApiResponse<null>> =>
    request.put<null>(`/bookings/${id}`, data)
};
