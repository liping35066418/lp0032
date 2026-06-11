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

export const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: 'gold' },
  confirmed: { text: '已确认', color: 'blue' },
  in_progress: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'default' },
  checked_in: { text: '已签到', color: 'cyan' },
  paid: { text: '已支付', color: 'success' },
  refunded: { text: '已退款', color: 'orange' },
  draft: { text: '草稿', color: 'default' },
  published: { text: '已上架', color: 'success' },
  offline: { text: '已下架', color: 'warning' },
  active: { text: '启用', color: 'success' },
  maintenance: { text: '维护中', color: 'warning' },
  inactive: { text: '停用', color: 'default' }
};

export const difficultyMap: Record<string, { text: string; color: string }> = {
  easy: { text: '简单', color: 'success' },
  medium: { text: '中等', color: 'blue' },
  hard: { text: '困难', color: 'orange' },
  nightmare: { text: '噩梦', color: 'error' }
};

export const roleMap: Record<string, { text: string; color: string }> = {
  admin: { text: '管理员', color: 'purple' },
  host: { text: '主持人', color: 'blue' },
  player: { text: '玩家', color: 'default' }
};

export const orderTypeMap: Record<string, string> = {
  ticket: '门票',
  drink: '饮品',
  package: '套餐',
  refund: '退款'
};

export const paymentMethodMap: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
  onsite: '现场支付',
  manual: '手动操作',
  auto: '系统自动'
};
