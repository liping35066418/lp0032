export type UserRole = 'admin' | 'host' | 'player';

export interface User {
  id: number;
  username: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithPassword extends User {
  password: string;
}

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

export interface Category {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type RoomStatus = 'active' | 'maintenance' | 'inactive';

export interface Room {
  id: number;
  name: string;
  capacity: number;
  facilities?: string;
  status: RoomStatus;
  created_at: string;
  updated_at: string;
}

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

export interface GameSession {
  id: number;
  schedule_id: number;
  started_at?: string;
  ended_at?: string;
  duration?: number;
  actual_players?: number;
  host_rating?: number;
  host_comment?: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  content?: string;
  is_read: number;
  created_at: string;
}

export interface ScheduleWithDetails extends Schedule {
  script_name: string;
  script_category: string;
  script_difficulty: string;
  room_name: string;
  host_name: string;
  bookings?: BookingWithPlayer[];
}

export interface BookingWithPlayer extends Booking {
  player_name: string;
  player_phone: string;
}
