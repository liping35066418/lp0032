import { request, ApiResponse, PaginatedResponse } from './client';

export type OrderType = 'ticket' | 'drink' | 'package' | 'refund';
export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

export interface Order {
  id: number;
  order_no: string;
  user_id: number;
  schedule_id?: number;
  booking_id?: number;
  type: OrderType;
  amount: number;
  status: OrderStatus;
  paid_at?: string;
  payment_method?: string;
  created_at: string;
}

export interface OrderWithDetails extends Order {
  user_name?: string;
  user_phone?: string;
  start_time?: string;
  end_time?: string;
  script_name?: string;
  cover_image?: string;
  room_name?: string;
  host_name?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_type: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  description?: string;
}

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  user_id?: number;
}

export const orderApi = {
  getList: (params?: OrderListParams): Promise<ApiResponse<PaginatedResponse<OrderWithDetails>>> =>
    request.get<PaginatedResponse<OrderWithDetails>>('/orders', { params }),

  getMyOrders: (params?: OrderListParams): Promise<ApiResponse<PaginatedResponse<OrderWithDetails>>> =>
    request.get<PaginatedResponse<OrderWithDetails>>('/orders/my', { params }),

  getDetail: (id: number): Promise<ApiResponse<OrderWithDetails>> =>
    request.get<OrderWithDetails>(`/orders/${id}`),

  pay: (id: number, payment_method?: string): Promise<ApiResponse<null>> =>
    request.post<null>(`/orders/${id}/pay`, { payment_method })
};
