import { Router } from 'express';
import db from '../config/database';
import { success, error, paginated } from '../utils/response';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

function updateSchedulePlayerCount(scheduleId: number) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(player_count), 0) as total 
    FROM bookings 
    WHERE schedule_id = ? AND status != 'cancelled'
  `).get(scheduleId) as { total: number };
  
  const schedule = db.prepare('SELECT max_players FROM schedules WHERE id = ?').get(scheduleId) as { max_players: number };
  
  const isLocked = result.total >= schedule.max_players ? 1 : 0;
  const status = result.total >= schedule.max_players ? 'confirmed' : 'pending';
  
  db.prepare('UPDATE schedules SET current_players = ?, is_locked = ?, status = ? WHERE id = ?').run(result.total, isLocked, status, scheduleId);
}

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { page = 1, pageSize = 20, status, schedule_id, player_id } = req.query;
  const currentUser = req.user!;
  
  let sql = `
    SELECT b.*, s.start_time, s.end_time, s.status as schedule_status,
           sc.name as script_name, sc.cover_image,
           r.name as room_name, u.name as player_name, u.phone as player_phone
    FROM bookings b
    LEFT JOIN schedules s ON b.schedule_id = s.id
    LEFT JOIN scripts sc ON s.script_id = sc.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN users u ON b.player_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (currentUser.role === 'player') {
    sql += ' AND b.player_id = ?';
    params.push(currentUser.id);
  } else if (player_id) {
    sql += ' AND b.player_id = ?';
    params.push(parseInt(player_id as string));
  }
  
  if (status) {
    sql += ' AND b.status = ?';
    params.push(status);
  }
  if (schedule_id) {
    sql += ' AND b.schedule_id = ?';
    params.push(parseInt(schedule_id as string));
  }
  
  const countSql = sql.replace(/SELECT b\.[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;
  
  sql += ' ORDER BY b.booked_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
  
  const bookings = db.prepare(sql).all(...params);
  
  paginated(res, bookings, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/my', authenticateToken, (req: AuthRequest, res) => {
  const { page = 1, pageSize = 20, status } = req.query;
  const playerId = req.user!.id;
  
  let sql = `
    SELECT b.*, s.start_time, s.end_time, s.status as schedule_status, s.is_locked,
           sc.name as script_name, sc.cover_image, sc.category, sc.difficulty, sc.base_price,
           r.name as room_name, u.name as host_name
    FROM bookings b
    LEFT JOIN schedules s ON b.schedule_id = s.id
    LEFT JOIN scripts sc ON s.script_id = sc.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN users u ON s.host_id = u.id
    WHERE b.player_id = ?
  `;
  const params: any[] = [playerId];
  
  if (status) {
    sql += ' AND b.status = ?';
    params.push(status);
  }
  
  const countSql = sql.replace(/SELECT b\.[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;
  
  sql += ' ORDER BY b.booked_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
  
  const bookings = db.prepare(sql).all(...params);
  
  paginated(res, bookings, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/:id', authenticateToken, (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const currentUser = req.user!;
  
  const booking = db.prepare(`
    SELECT b.*, s.start_time, s.end_time, s.status as schedule_status,
           sc.name as script_name, sc.cover_image, sc.base_price,
           r.name as room_name, u.name as player_name, u.phone as player_phone,
           host.name as host_name
    FROM bookings b
    LEFT JOIN schedules s ON b.schedule_id = s.id
    LEFT JOIN scripts sc ON s.script_id = sc.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN users u ON b.player_id = u.id
    LEFT JOIN users host ON s.host_id = host.id
    WHERE b.id = ?
  `).get(id) as any;
  
  if (!booking) {
    return error(res, '预订不存在', 1, 404);
  }
  
  if (currentUser.role === 'player' && booking.player_id !== currentUser.id) {
    return error(res, '无权查看该预订', 1, 403);
  }
  
  success(res, booking);
});

router.post('/:id/checkin', authenticateToken, requireRole('admin', 'host'), (req, res) => {
  const id = parseInt(req.params.id);
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
  if (!booking) {
    return error(res, '预订不存在', 1, 404);
  }
  
  if (booking.status !== 'confirmed') {
    return error(res, '只有已确认的预订才能核验');
  }
  
  try {
    db.prepare(`
      UPDATE bookings 
      SET status = 'checked_in', checked_in_at = datetime('now')
      WHERE id = ?
    `).run(id);
    
    success(res, null, '核验成功');
  } catch (err) {
    error(res, '核验失败');
  }
});

router.post('/:id/cancel', authenticateToken, (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const currentUser = req.user!;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
  if (!booking) {
    return error(res, '预订不存在', 1, 404);
  }
  
  if (currentUser.role === 'player' && booking.player_id !== currentUser.id) {
    return error(res, '无权取消该预订', 1, 403);
  }
  
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return error(res, '该预订状态不允许取消');
  }
  
  const schedule = db.prepare('SELECT start_time, status FROM schedules WHERE id = ?').get(booking.schedule_id);
  if (schedule.status === 'in_progress' || schedule.status === 'completed') {
    return error(res, '场次已开始或已完成，无法取消');
  }
  
  const tx = db.transaction(() => {
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
    updateSchedulePlayerCount(booking.schedule_id);
    
    const pendingOrder = db.prepare('SELECT id, amount FROM orders WHERE booking_id = ? AND status = ?').get(id, 'pending') as any;
    if (pendingOrder) {
      const refundOrderNo = `REF${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      db.prepare(`
        INSERT INTO orders (order_no, user_id, schedule_id, booking_id, type, amount, status, paid_at, payment_method)
        VALUES (?, ?, ?, ?, 'refund', ?, 'refunded', datetime('now'), 'auto')
      `).run(refundOrderNo, booking.player_id, booking.schedule_id, id, pendingOrder.amount);
      
      db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(pendingOrder.id);
    }
  });
  
  try {
    tx();
    success(res, null, '取消成功，费用已原路退回');
  } catch (err) {
    error(res, '取消失败');
  }
});

router.put('/:id', authenticateToken, (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const currentUser = req.user!;
  const { player_count, player_names } = req.body;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
  if (!booking) {
    return error(res, '预订不存在', 1, 404);
  }
  
  if (currentUser.role === 'player' && booking.player_id !== currentUser.id) {
    return error(res, '无权修改该预订', 1, 403);
  }
  
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return error(res, '该预订状态不允许修改');
  }
  
  const schedule = db.prepare('SELECT max_players, current_players FROM schedules WHERE id = ?').get(booking.schedule_id) as any;
  const otherPlayers = schedule.current_players - booking.player_count;
  
  if (player_count && otherPlayers + parseInt(player_count) > schedule.max_players) {
    return error(res, `修改失败，该场次剩余 ${schedule.max_players - otherPlayers} 个名额`);
  }
  
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE bookings 
      SET player_count = COALESCE(?, player_count),
          player_names = COALESCE(?, player_names)
      WHERE id = ?
    `).run(player_count ? parseInt(player_count) : null, player_names || null, id);
    
    updateSchedulePlayerCount(booking.schedule_id);
  });
  
  try {
    tx();
    success(res, null, '修改成功');
  } catch (err) {
    error(res, '修改失败');
  }
});

export default router;
