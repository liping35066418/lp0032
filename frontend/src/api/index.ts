import { request } from './client';
import type { PaginatedResponse, ApiResponse } from './client';

export type { PaginatedResponse, ApiResponse };
import type {
  Script,
  Room,
  User,
  Schedule,
  ScheduleWithDetails,
  Order,
  Drink,
  Category,
  CategoryWithCount,
  ScriptStatus,
  RoomStatus,
  UserRole,
  ScheduleStatus,
  OrderStatus,
  OrderType
} from '../types';

export * from '../types';

export interface OverviewData {
  totalUsers: number;
  totalScripts: number;
  totalRooms: number;
  totalHosts: number;
  totalRevenue: number;
  totalOrders: number;
  completedSchedules: number;
  totalPlayers: number;
  totalRefund: number;
}

export interface DailySchedule {
  id: number;
  script_name: string;
  cover_image?: string;
  room_name: string;
  host_name: string;
  start_time: string;
  end_time: string;
  status: ScheduleStatus;
  booking_count: number;
  player_count: number;
}

export interface DailyData {
  date: string;
  schedules: DailySchedule[];
  totalSchedules: number;
  totalRevenue: number;
  totalPlayers: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  refund: number;
  order_count: number;
}

export interface ScriptStats {
  id: number;
  name: string;
  category: string;
  difficulty: string;
  schedule_count: number;
  completed_count: number;
  player_count: number;
  revenue: number;
}

export interface HostStats {
  id: number;
  name: string;
  phone?: string;
  schedule_count: number;
  completed_count: number;
  avg_rating: number;
  player_count: number;
}

export interface CategoryStats {
  name: string;
  script_count: number;
  schedule_count: number;
  revenue: number;
}

export interface ScriptQueryParams {
  page?: number;
  pageSize?: number;
  category?: string;
  difficulty?: string;
  status?: ScriptStatus;
  keyword?: string;
  minPlayers?: number;
  maxPlayers?: number;
}

export interface ScheduleQueryParams {
  page?: number;
  pageSize?: number;
  status?: ScheduleStatus;
  script_id?: number;
  room_id?: number;
  host_id?: number;
  start_date?: string;
  end_date?: string;
  include_bookings?: boolean;
}

export interface OrderQueryParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  type?: OrderType;
  start_date?: string;
  end_date?: string;
  user_id?: number;
}

export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  keyword?: string;
}

export interface DrinkQueryParams {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: 'active' | 'inactive' | 'all';
  keyword?: string;
}

export const statisticsApi = {
  getOverview: (params?: { start_date?: string; end_date?: string }) =>
    request.get<OverviewData>('/statistics/overview', { params }),

  getDaily: (date?: string) =>
    request.get<DailyData>('/statistics/daily', { params: { date } }),

  getRevenue: (params?: { start_date?: string; end_date?: string; group_by?: 'day' | 'month' | 'year' }) =>
    request.get<RevenueData[]>('/statistics/revenue', { params }),

  getScriptStats: (params?: { start_date?: string; end_date?: string; top?: number }) =>
    request.get<ScriptStats[]>('/statistics/scripts', { params }),

  getHostStats: (params?: { start_date?: string; end_date?: string }) =>
    request.get<HostStats[]>('/statistics/hosts', { params }),

  getCategoryStats: () =>
    request.get<CategoryStats[]>('/statistics/categories')
};

export const scriptsApi = {
  getList: (params?: ScriptQueryParams) =>
    request.get<PaginatedResponse<Script>>('/scripts', { params }),

  getCategories: () =>
    request.get<{ name: string; count: number }[]>('/scripts/categories'),

  getDetail: (id: number) =>
    request.get<Script>(`/scripts/${id}`),

  create: (data: Partial<Script>) =>
    request.post<Script>('/scripts', data),

  update: (id: number, data: Partial<Script>) =>
    request.put<Script>(`/scripts/${id}`, data),

  updateStatus: (id: number, status: ScriptStatus) =>
    request.patch<{ status: ScriptStatus }>(`/scripts/${id}/status`, { status }),

  batchUpdateStatus: (ids: number[], status: ScriptStatus) =>
    request.post<{ updated: number }>('/scripts/batch/status', { ids, status }),

  delete: (id: number) =>
    request.delete(`/scripts/${id}`)
};

export const schedulesApi = {
  getList: (params?: ScheduleQueryParams) =>
    request.get<PaginatedResponse<ScheduleWithDetails>>('/schedules', { params }),

  getAvailable: (params?: { page?: number; pageSize?: number; script_id?: number; date?: string; category?: string; difficulty?: string }) =>
    request.get<PaginatedResponse<ScheduleWithDetails>>('/schedules/available', { params }),

  getDetail: (id: number) =>
    request.get<ScheduleWithDetails>(`/schedules/${id}`),

  create: (data: { script_id: number; room_id: number; host_id: number; start_time: string; end_time: string; notes?: string }) =>
    request.post<Schedule>('/schedules', data),

  update: (id: number, data: Partial<Schedule>) =>
    request.put<Schedule>(`/schedules/${id}`, data),

  start: (id: number) =>
    request.post(`/schedules/${id}/start`),

  end: (id: number, data?: { actual_players?: number; host_rating?: number; host_comment?: string }) =>
    request.post(`/schedules/${id}/end`, data),

  cancel: (id: number) =>
    request.post(`/schedules/${id}/cancel`),

  delete: (id: number) =>
    request.delete(`/schedules/${id}`),

  checkConflict: (params: { room_id: number; host_id: number; start_time: string; end_time: string; exclude_id?: number }) =>
    request.get<{ hasConflict: boolean; message?: string }>('/schedules/conflict', { params })
};

export const roomsApi = {
  getList: (params?: { page?: number; pageSize?: number; status?: RoomStatus }) =>
    request.get<PaginatedResponse<Room>>('/rooms', { params }),

  getAvailable: (params?: { start_time?: string; end_time?: string; exclude_schedule_id?: number }) =>
    request.get<Room[]>('/rooms/available', { params }),

  getDetail: (id: number) =>
    request.get<Room>(`/rooms/${id}`),

  create: (data: { name: string; capacity: number; facilities?: string; status?: RoomStatus }) =>
    request.post<Room>('/rooms', data),

  update: (id: number, data: Partial<Room>) =>
    request.put<Room>(`/rooms/${id}`, data),

  delete: (id: number) =>
    request.delete(`/rooms/${id}`)
};

export const usersApi = {
  getList: (params?: UserQueryParams) =>
    request.get<PaginatedResponse<User>>('/users', { params }),

  getHosts: (params?: { available?: boolean; start_time?: string; end_time?: string; exclude_schedule_id?: number }) =>
    request.get<User[]>('/users/hosts', { params }),

  getDetail: (id: number) =>
    request.get<User>(`/users/${id}`),

  create: (data: { username: string; password: string; name: string; phone?: string; role: UserRole; avatar?: string }) =>
    request.post<User>('/users', data),

  update: (id: number, data: Partial<User> & { password?: string }) =>
    request.put<User>(`/users/${id}`, data),

  delete: (id: number) =>
    request.delete(`/users/${id}`)
};

export const ordersApi = {
  getList: (params?: OrderQueryParams) =>
    request.get<PaginatedResponse<Order & { user_name?: string; user_phone?: string; script_name?: string }>>('/orders', { params }),

  getMy: (params?: { page?: number; pageSize?: number; status?: OrderStatus; type?: OrderType }) =>
    request.get<PaginatedResponse<Order & { script_name?: string; room_name?: string }>>('/orders/my', { params }),

  getDetail: (id: number) =>
    request.get<Order & { user_name?: string; user_phone?: string; script_name?: string; room_name?: string; host_name?: string; items?: any[] }>(`/orders/${id}`),

  pay: (id: number, payment_method?: string) =>
    request.post(`/orders/${id}/pay`, { payment_method }),

  refund: (id: number, reason?: string) =>
    request.post(`/orders/${id}/refund`, { reason }),

  createOnsite: (data: { user_id?: number; schedule_id?: number; items: any[]; payment_method?: string }) =>
    request.post<{ orderId: number; orderNo: string; amount: number }>('/orders/onsite', data)
};

export const drinksApi = {
  getList: (params?: DrinkQueryParams) =>
    request.get<PaginatedResponse<Drink>>('/drinks', { params }),

  getCategories: () =>
    request.get<{ name: string; count: number }[]>('/drinks/categories'),

  getDetail: (id: number) =>
    request.get<Drink>(`/drinks/${id}`),

  create: (data: Partial<Drink>) =>
    request.post<Drink>('/drinks', data),

  update: (id: number, data: Partial<Drink>) =>
    request.put<Drink>(`/drinks/${id}`, data),

  updateStock: (id: number, data: { stock?: number; change?: number }) =>
    request.patch<{ stock: number }>(`/drinks/${id}/stock`, data),

  delete: (id: number) =>
    request.delete(`/drinks/${id}`)
};

export const categoriesApi = {
  getAllCategories: (params?: { status?: 'active' | 'inactive' }) =>
    request.get<CategoryWithCount[]>('/categories', { params }),

  getActiveCategories: () =>
    request.get<{ name: string; count: number }[]>('/categories/active'),

  createCategory: (data: { name: string }) =>
    request.post<Category>('/categories', data),

  updateCategory: (id: number, data: { name: string }) =>
    request.put<Category>(`/categories/${id}`, data),

  updateCategoryStatus: (id: number, status: 'active' | 'inactive') =>
    request.patch<{ status: 'active' | 'inactive' }>(`/categories/${id}/status`, { status }),

  deleteCategory: (id: number) =>
    request.delete(`/categories/${id}`)
};
