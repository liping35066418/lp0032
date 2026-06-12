import { Router } from 'express';
import db from '../config/database';
import { success, error, paginated } from '../utils/response';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { Schedule, ScheduleWithDetails, ScheduleStatus } from '../database/types';

const router = Router();

function checkConflict(roomId: number, hostId: number, startTime: string, endTime: string, excludeId?: number): { hasConflict: boolean; message?: string } {
  let sql = `
    SELECT id FROM schedules 
    WHERE status != 'cancelled'
    AND ((room_id = ? OR host_id = ?)
    AND start_time < ? AND end_time > ?)
  `;
  const params: any[] = [roomId, hostId, endTime, startTime];
  
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  
  const conflicts = db.prepare(sql).all(...params) as { id: number }[];
  
  if (conflicts.length > 0) {
    return { hasConflict: true, message: '该时间段房间或主持人已有安排' };
  }
  
  return { hasConflict: false };
}

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

router.get('/', authenticateToken, (req, res) => {
  const { 
    page = 1, 
    pageSize = 20, 
    status, 
    script_id, 
    room_id, 
    host_id,
    start_date,
    end_date,
    include_bookings
  } = req.query;
  
  let sql = `
    SELECT s.*, sc.name as script_name, sc.category as script_category, sc.difficulty as script_difficulty,
           r.name as room_name, u.name as host_name
    FROM schedules s
    LEFT JOIN scripts sc ON s.script_id = sc.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN users u ON s.host_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  if (script_id) {
    sql += ' AND s.script_id = ?';
    params.push(parseInt(script_id as string));
  }
  if (room_id) {
    sql += ' AND s.room_id = ?';
    params.push(parseInt(room_id as string));
  }
  if (host_id) {
    sql += ' AND s.host_id = ?';
    params.push(parseInt(host_id as string));
  }
  if (start_date) {
    sql += ' AND DATE(s.start_time) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(s.start_time) <= ?';
    params.push(end_date);
  }
  
  const countSql = sql.replace(/SELECT s\.[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;
  
  sql += ' ORDER BY s.start_time DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
  
  const schedules = db.prepare(sql).all(...params) as ScheduleWithDetails[];
  
  if (include_bookings === 'true') {
    for (const schedule of schedules) {
      schedule.bookings = db.prepare(`
        SELECT b.*, u.name as player_name, u.phone as player_phone
        FROM bookings b
        LEFT JOIN users u ON b.player_id = u.id
        WHERE b.schedule_id = ?
        ORDER BY b.booked_at
      `).all(schedule.id) as any[];
    }
  }
  
  paginated(res, schedules, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/available', (req, res) => {
  const { page = 1, pageSize = 20, script_id, date, category, difficulty } = req.query;
  
  let sql = `
    SELECT s.*, sc.name as script_name, sc.category as script_category, sc.difficulty as script_difficulty,
           sc.cover_image, sc.base_price, sc.description,
           r.name as room_name, u.name as host_name
    FROM schedules s
    LEFT JOIN scripts sc ON s.script_id = sc.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN users u ON s.host_id = u.id
    WHERE s.status IN ('pending', 'confirmed')
    AND s.is_locked = 0
    AND s.start_time > datetime('now')
    AND sc.status = 'published'
  `;
  const params: any[] = [];
  
  if (script_id) {
    sql += ' AND s.script_id = ?';
    params.push(parseInt(script_id as string));
  }
  if (date) {
    sql += ' AND DATE(s.start_time) = ?';
    params.push(date);
  }
  if (category) {
    sql += ' AND sc.category = ?';
    params.push(category);
  }
  if (difficulty) {
    sql += ' AND sc.difficulty = ?';
    params.push(difficulty);
  }
  
  const countSql = sql.replace(/SELECT s\.[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;
  
  sql += ' ORDER BY s.start_time ASC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
  
  const schedules = db.prepare(sql).all(...params);
  
  paginated(res, schedules, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/:id', authenticateToken, (req, res) => {
  const schedule = db.prepare(`
    SELECT s.*, sc.name as script_name, sc.category as script_category, sc.difficulty as script_difficulty,
           sc.cover_image, sc.base_price, sc.description, sc.min_players as script_min_players, sc.max_players as script_max_players,
           r.name as room_name, r.capacity as room_capacity,
           u.name as host_name, u.phone as host_phone
    FROM schedules s
    LEFT JOIN scripts sc ON s.script_id = sc.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN users u ON s.host_id = u.id
    WHERE s.id = ?
  `).get(req.params.id) as any;
  
  if (!schedule) {
    return error(res, '场次不存在', 1, 404);
  }
  
  schedule.bookings = db.prepare(`
    SELECT b.*, u.name as player_name, u.phone as player_phone, u.avatar as player_avatar
    FROM bookings b
    LEFT JOIN users u ON b.player_id = u.id
    WHERE b.schedule_id = ?
    ORDER BY b.booked_at
  `).all(req.params.id);
  
  success(res, schedule);
});

router.post('/', authenticateToken, requireRole('admin', 'host'), (req: AuthRequest, res) => {
  const { script_id, room_id, host_id, start_time, end_time, notes } = req.body;
  
  if (!script_id || !room_id || !host_id || !start_time || !end_time) {
    return error(res, '必填字段不能为空');
  }
  
  const script = db.prepare('SELECT min_players, max_players, status FROM scripts WHERE id = ?').get(script_id);
  if (!script) {
    return error(res, '剧本不存在');
  }
  if (script.status === 'draft' || script.status === 'offline') {
    return error(res, '该剧本未上架，无法安排场次');
  }
  
  const room = db.prepare('SELECT id, status FROM rooms WHERE id = ?').get(room_id);
  if (!room || room.status !== 'active') {
    return error(res, '房间不存在或未启用');
  }
  
  const host = db.prepare("SELECT id, role FROM users WHERE id = ? AND role IN ('admin', 'host')").get(host_id);
  if (!host) {
    return error(res, '主持人不存在或无权限');
  }
  
  const conflict = checkConflict(room_id, host_id, start_time, end_time);
  if (conflict.hasConflict) {
    return error(res, conflict.message!);
  }
  
  const start = new Date(start_time);
  const end = new Date(end_time);
  if (end <= start) {
    return error(res, '结束时间必须晚于开始时间');
  }
  
  try {
    const info = db.prepare(`
      INSERT INTO schedules (script_id, room_id, host_id, start_time, end_time, min_players, max_players, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      parseInt(script_id), parseInt(room_id), parseInt(host_id),
      start_time, end_time,
      script.min_players, script.max_players,
      notes || null
    );
    
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(info.lastInsertRowid) as Schedule;
    success(res, schedule, '场次创建成功');
  } catch (err) {
    error(res, '创建失败');
  }
});

router.put('/:id', authenticateToken, requireRole('admin', 'host'), (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Schedule | undefined;
  
  if (!existing) {
    return error(res, '场次不存在', 1, 404);
  }
  
  if (existing.status === 'in_progress' || existing.status === 'completed') {
    return error(res, '进行中或已完成的场次无法修改');
  }
  
  const { script_id, room_id, host_id, start_time, end_time, notes, status } = req.body;
  
  const finalScriptId = script_id || existing.script_id;
  const finalRoomId = room_id || existing.room_id;
  const finalHostId = host_id || existing.host_id;
  const finalStartTime = start_time || existing.start_time;
  const finalEndTime = end_time || existing.end_time;
  
  if (start_time || end_time || room_id || host_id) {
    const conflict = checkConflict(finalRoomId, finalHostId, finalStartTime, finalEndTime, id);
    if (conflict.hasConflict) {
      return error(res, conflict.message!);
    }
  }
  
  if (status && !['pending', 'confirmed', 'cancelled'].includes(status)) {
    return error(res, '无效的状态');
  }
  
  try {
    db.prepare(`
      UPDATE schedules SET
        script_id = COALESCE(?, script_id),
        room_id = COALESCE(?, room_id),
        host_id = COALESCE(?, host_id),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      script_id ? parseInt(script_id) : null,
      room_id ? parseInt(room_id) : null,
      host_id ? parseInt(host_id) : null,
      start_time || null,
      end_time || null,
      notes || null,
      status || null,
      id
    );
    
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Schedule;
    success(res, schedule, '更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.post('/:id/book', authenticateToken, (req: AuthRequest, res) => {
  const scheduleId = parseInt(req.params.id);
  const playerId = req.user!.id;
  const { player_count = 1, player_names } = req.body;
  
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId) as Schedule | undefined;
  if (!schedule) {
    return error(res, '场次不存在', 1, 404);
  }
  
  if (schedule.status === 'cancelled' || schedule.status === 'completed') {
    return error(res, '该场次已取消或已完成');
  }
  
  if (schedule.is_locked) {
    return error(res, '该场次已满员，无法预订');
  }
  
  if (new Date(schedule.start_time) < new Date()) {
    return error(res, '该场次已开始，无法预订');
  }
  
  const existingBooking = db.prepare('SELECT id FROM bookings WHERE schedule_id = ? AND player_id = ? AND status != ?').get(scheduleId, playerId, 'cancelled');
  if (existingBooking) {
    return error(res, '您已预订该场次');
  }
  
  const currentPlayers = db.prepare(`
    SELECT COALESCE(SUM(player_count), 0) as total 
    FROM bookings WHERE schedule_id = ? AND status != 'cancelled'
  `).get(scheduleId) as { total: number };
  
  if (currentPlayers.total + player_count > schedule.max_players) {
    return error(res, `预订失败，该场次剩余 ${schedule.max_players - currentPlayers.total} 个名额`);
  }
  
  const tx = db.transaction(() => {
    const bookingInfo = db.prepare(`
      INSERT INTO bookings (schedule_id, player_id, player_count, player_names, status)
      VALUES (?, ?, ?, ?, 'confirmed')
    `).run(scheduleId, playerId, parseInt(player_count), player_names || null);
    
    updateSchedulePlayerCount(scheduleId);
    
    const script = db.prepare('SELECT base_price, name FROM scripts WHERE id = ?').get(schedule.script_id);
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const amount = script.base_price * parseInt(player_count);
    
    const orderInfo = db.prepare(`
      INSERT INTO orders (order_no, user_id, schedule_id, booking_id, type, amount, status)
      VALUES (?, ?, ?, ?, 'ticket', ?, 'pending')
    `).run(orderNo, playerId, scheduleId, bookingInfo.lastInsertRowid, amount);
    
    db.prepare(`
      INSERT INTO order_items (order_id, item_type, item_name, quantity, unit_price, subtotal)
      VALUES (?, 'ticket', ?, ?, ?, ?)
    `).run(orderInfo.lastInsertRowid, script.name, parseInt(player_count), script.base_price, amount);
    
    return { bookingId: bookingInfo.lastInsertRowid, orderId: orderInfo.lastInsertRowid, orderNo, amount };
  });
  
  try {
    const result = tx();
    success(res, result, '预订成功');
  } catch (err) {
    error(res, '预订失败');
  }
});

router.post('/:id/start', authenticateToken, requireRole('admin', 'host'), (req, res) => {
  const id = parseInt(req.params.id);
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Schedule | undefined;
  
  if (!schedule) {
    return error(res, '场次不存在', 1, 404);
  }
  
  if (schedule.status !== 'confirmed') {
    return error(res, '只有已确认的场次才能开始');
  }
  
  const tx = db.transaction(() => {
    db.prepare('UPDATE schedules SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('in_progress', id);
    db.prepare(`
      INSERT INTO game_sessions (schedule_id, started_at)
      VALUES (?, datetime('now'))
    `).run(id);
    db.prepare("UPDATE bookings SET status = 'checked_in', checked_in_at = datetime('now') WHERE schedule_id = ? AND status = 'confirmed'").run(id);
  });
  
  try {
    tx();
    success(res, null, '场次已开始');
  } catch (err) {
    error(res, '操作失败');
  }
});

router.post('/:id/end', authenticateToken, requireRole('admin', 'host'), (req, res) => {
  const id = parseInt(req.params.id);
  const { actual_players, host_rating, host_comment, booking_drinks } = req.body;
  
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Schedule | undefined;
  if (!schedule) {
    return error(res, '场次不存在', 1, 404);
  }
  
  if (schedule.status !== 'in_progress') {
    return error(res, '只有进行中的场次才能结束');
  }
  
  const tx = db.transaction(() => {
    db.prepare('UPDATE schedules SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', id);
    
    const session = db.prepare('SELECT id, started_at FROM game_sessions WHERE schedule_id = ? ORDER BY id DESC LIMIT 1').get(id);
    if (session) {
      const start = new Date(session.started_at);
      const end = new Date();
      const duration = Math.round((end.getTime() - start.getTime()) / 60000);
      
      db.prepare(`
        UPDATE game_sessions 
        SET ended_at = datetime('now'), duration = ?, actual_players = ?, host_rating = ?, host_comment = ?
        WHERE id = ?
      `).run(duration, actual_players || null, host_rating || null, host_comment || null, session.id);
    }
    
    db.prepare("UPDATE bookings SET status = 'completed' WHERE schedule_id = ?").run(id);
    
    if (booking_drinks && booking_drinks.length > 0) {
      const drinkStockUpdates: Record<number, number> = {};
      const drinkInfoCache: Record<number, any> = {};
      
      for (const bd of booking_drinks) {
        const bookingId = parseInt(bd.booking_id);
        const drinks = bd.drinks || [];
        
        if (drinks.length === 0) continue;
        
        const order = db.prepare(
          "SELECT * FROM orders WHERE schedule_id = ? AND booking_id = ? AND type = 'ticket' AND status = 'pending'"
        ).get(id, bookingId) as any;
        
        if (!order) continue;
        
        let drinkTotal = 0;
        for (const d of drinks) {
          const drinkId = parseInt(d.drink_id);
          const qty = parseInt(d.quantity);
          
          if (qty <= 0) continue;
          
          if (!drinkInfoCache[drinkId]) {
            const drink = db.prepare('SELECT * FROM drinks WHERE id = ? AND status = ?').get(drinkId, 'active') as any;
            if (!drink) {
              throw new Error(`饮品不存在或已下架: ${drinkId}`);
            }
            drinkInfoCache[drinkId] = drink;
          }
          
          const drink = drinkInfoCache[drinkId];
          const currentReserved = drinkStockUpdates[drinkId] || 0;
          const remainingStock = drink.stock - currentReserved;
          
          if (remainingStock < qty) {
            throw new Error(`饮品「${drink.name}」库存不足，剩余库存: ${remainingStock}`);
          }
          
          drinkStockUpdates[drinkId] = currentReserved + qty;
          
          const subtotal = qty * drink.price;
          drinkTotal += subtotal;
          
          db.prepare(`
            INSERT INTO order_items (order_id, item_type, item_name, quantity, unit_price, subtotal, description)
            VALUES (?, 'drink', ?, ?, ?, ?, ?)
          `).run(order.id, drink.name, qty, drink.price, subtotal, drink.description || null);
        }
        
        if (drinkTotal > 0) {
          const newAmount = order.amount + drinkTotal;
          db.prepare(`
            UPDATE orders 
            SET type = 'package', amount = ?, status = 'paid', paid_at = datetime('now'), payment_method = 'onsite'
            WHERE id = ?
          `).run(newAmount, order.id);
        } else {
          db.prepare(`
            UPDATE orders 
            SET status = 'paid', paid_at = datetime('now'), payment_method = 'onsite'
            WHERE id = ?
          `).run(order.id);
        }
      }
      
      for (const [drinkId, qty] of Object.entries(drinkStockUpdates)) {
        db.prepare('UPDATE drinks SET stock = stock - ? WHERE id = ?').run(qty, parseInt(drinkId));
      }
    }
    
    db.prepare("UPDATE orders SET status = 'paid', paid_at = datetime('now'), payment_method = 'onsite' WHERE schedule_id = ? AND status = 'pending'").run(id);
  });
  
  try {
    tx();
    success(res, null, '场次已结束');
  } catch (err: any) {
    error(res, err.message || '操作失败');
  }
});

router.post('/:id/cancel', authenticateToken, requireRole('admin', 'host'), (req, res) => {
  const id = parseInt(req.params.id);
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Schedule | undefined;
  
  if (!schedule) {
    return error(res, '场次不存在', 1, 404);
  }
  
  if (schedule.status === 'in_progress' || schedule.status === 'completed') {
    return error(res, '进行中或已完成的场次无法取消');
  }
  
  const tx = db.transaction(() => {
    db.prepare('UPDATE schedules SET status = ?, is_locked = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('cancelled', id);
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE schedule_id = ?").run(id);
    
    const pendingOrders = db.prepare('SELECT id, amount, user_id FROM orders WHERE schedule_id = ? AND status = ?').all(id, 'pending') as any[];
    for (const order of pendingOrders) {
      const refundOrderNo = `REF${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      db.prepare(`
        INSERT INTO orders (order_no, user_id, schedule_id, type, amount, status, paid_at, payment_method)
        VALUES (?, ?, ?, 'refund', ?, 'refunded', datetime('now'), 'auto')
      `).run(refundOrderNo, order.user_id, id, order.amount);
      
      db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(order.id);
    }
  });
  
  try {
    tx();
    success(res, null, '场次已取消，相关预订已自动退款');
  } catch (err) {
    error(res, '操作失败');
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  
  const schedule = db.prepare('SELECT status FROM schedules WHERE id = ?').get(id);
  if (!schedule) {
    return error(res, '场次不存在', 1, 404);
  }
  
  if (schedule.status !== 'pending' && schedule.status !== 'cancelled') {
    return error(res, '只能删除待确认或已取消的场次');
  }
  
  try {
    db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    success(res, null, '删除成功');
  } catch (err) {
    error(res, '删除失败');
  }
});

export default router;
