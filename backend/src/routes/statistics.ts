import { Router } from 'express';
import db from '../config/database';
import { success, error } from '../utils/response';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/overview', authenticateToken, requireRole('admin'), (req, res) => {
  const { start_date, end_date } = req.query;
  
  let dateCondition = '';
  const params: any[] = [];
  
  if (start_date) {
    dateCondition += ' AND DATE(created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    dateCondition += ' AND DATE(created_at) <= ?';
    params.push(end_date);
  }
  
  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  const totalScripts = (db.prepare('SELECT COUNT(*) as count FROM scripts').get() as { count: number }).count;
  const totalRooms = (db.prepare('SELECT COUNT(*) as count FROM rooms WHERE status = ?').get('active') as { count: number }).count;
  const totalHosts = (db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('host') as { count: number }).count;
  
  const revenueSql = `
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM orders 
    WHERE status = 'paid' AND type != 'refund'
    ${dateCondition}
  `;
  const totalRevenue = (db.prepare(revenueSql).get(...params) as { total: number }).total;
  
  const refundSql = `
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM orders 
    WHERE status = 'refunded' AND type = 'refund'
    ${dateCondition}
  `;
  const totalRefund = (db.prepare(refundSql).get(...params) as { total: number }).total;
  
  const orderCountSql = `
    SELECT COUNT(*) as count 
    FROM orders 
    WHERE status = 'paid'
    ${dateCondition}
  `;
  const totalOrders = (db.prepare(orderCountSql).get(...params) as { count: number }).count;
  
  const scheduleCountSql = `
    SELECT COUNT(*) as count 
    FROM schedules 
    WHERE status = 'completed'
    ${dateCondition}
  `;
  const completedSchedules = (db.prepare(scheduleCountSql).get(...params) as { count: number }).count;
  
  const playerCountSql = `
    SELECT COALESCE(SUM(player_count), 0) as total 
    FROM bookings 
    WHERE status IN ('checked_in', 'completed')
    ${dateCondition}
  `;
  const totalPlayers = (db.prepare(playerCountSql).get(...params) as { total: number }).total;
  
  success(res, {
    totalUsers,
    totalScripts,
    totalRooms,
    totalHosts,
    totalRevenue: totalRevenue - totalRefund,
    totalOrders,
    completedSchedules,
    totalPlayers,
    totalRefund
  });
});

router.get('/revenue', authenticateToken, requireRole('admin'), (req, res) => {
  const { start_date, end_date, group_by = 'day' } = req.query;
  
  let dateFormat = '%Y-%m-%d';
  if (group_by === 'month') {
    dateFormat = '%Y-%m';
  } else if (group_by === 'year') {
    dateFormat = '%Y';
  }
  
  let dateCondition = '';
  const params: any[] = [];
  
  if (start_date) {
    dateCondition += ' AND DATE(paid_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    dateCondition += ' AND DATE(paid_at) <= ?';
    params.push(end_date);
  }
  
  const revenueData = db.prepare(`
    SELECT 
      strftime(?, paid_at) as date,
      COALESCE(SUM(CASE WHEN type != 'refund' THEN amount ELSE 0 END), 0) as revenue,
      COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0) as refund,
      COUNT(*) as order_count
    FROM orders
    WHERE status = 'paid' OR (status = 'refunded' AND type = 'refund')
    ${dateCondition}
    GROUP BY strftime(?, paid_at)
    ORDER BY date DESC
  `).all(dateFormat, ...params, dateFormat);
  
  success(res, revenueData);
});

router.get('/scripts', authenticateToken, requireRole('admin'), (req, res) => {
  const { start_date, end_date, top = 10 } = req.query;
  
  let dateCondition = '';
  const params: any[] = [];
  
  if (start_date) {
    dateCondition += ' AND DATE(s.start_time) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    dateCondition += ' AND DATE(s.start_time) <= ?';
    params.push(end_date);
  }
  
  const scriptStats = db.prepare(`
    SELECT 
      sc.id, sc.name, sc.category, sc.difficulty,
      COUNT(DISTINCT s.id) as schedule_count,
      COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_count,
      COALESCE(SUM(b.player_count), 0) as player_count,
      COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.type != 'refund' THEN o.amount ELSE 0 END), 0) as revenue
    FROM scripts sc
    LEFT JOIN schedules s ON sc.id = s.script_id
    LEFT JOIN bookings b ON s.id = b.schedule_id AND b.status != 'cancelled'
    LEFT JOIN orders o ON s.id = o.schedule_id
    WHERE 1=1 ${dateCondition}
    GROUP BY sc.id
    ORDER BY revenue DESC
    LIMIT ?
  `).all(...params, parseInt(top as string));
  
  success(res, scriptStats);
});

router.get('/hosts', authenticateToken, requireRole('admin'), (req, res) => {
  const { start_date, end_date } = req.query;
  
  let dateCondition = '';
  const params: any[] = [];
  
  if (start_date) {
    dateCondition += ' AND DATE(s.start_time) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    dateCondition += ' AND DATE(s.start_time) <= ?';
    params.push(end_date);
  }
  
  const hostStats = db.prepare(`
    SELECT 
      u.id, u.name, u.phone,
      COUNT(DISTINCT s.id) as schedule_count,
      COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_count,
      COALESCE(AVG(gs.host_rating), 0) as avg_rating,
      COALESCE(SUM(b.player_count), 0) as player_count
    FROM users u
    LEFT JOIN schedules s ON u.id = s.host_id
    LEFT JOIN game_sessions gs ON s.id = gs.schedule_id
    LEFT JOIN bookings b ON s.id = b.schedule_id AND b.status != 'cancelled'
    WHERE u.role = 'host'
    ${dateCondition}
    GROUP BY u.id
    ORDER BY completed_count DESC
  `).all(...params);
  
  success(res, hostStats);
});

router.get('/rooms', authenticateToken, requireRole('admin'), (req, res) => {
  const { start_date, end_date } = req.query;
  
  let dateCondition = '';
  const params: any[] = [];
  
  if (start_date) {
    dateCondition += ' AND DATE(s.start_time) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    dateCondition += ' AND DATE(s.start_time) <= ?';
    params.push(end_date);
  }
  
  const roomStats = db.prepare(`
    SELECT 
      r.id, r.name, r.capacity,
      COUNT(DISTINCT s.id) as schedule_count,
      COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_count,
      COALESCE(SUM(gs.duration), 0) as total_duration,
      COALESCE(SUM(b.player_count), 0) as player_count
    FROM rooms r
    LEFT JOIN schedules s ON r.id = s.room_id
    LEFT JOIN game_sessions gs ON s.id = gs.schedule_id
    LEFT JOIN bookings b ON s.id = b.schedule_id AND b.status != 'cancelled'
    WHERE r.status = 'active'
    ${dateCondition}
    GROUP BY r.id
    ORDER BY completed_count DESC
  `).all(...params);
  
  success(res, roomStats);
});

router.get('/categories', authenticateToken, requireRole('admin'), (req, res) => {
  const categoryStats = db.prepare(`
    SELECT 
      sc.category as name,
      COUNT(*) as script_count,
      COUNT(DISTINCT s.id) as schedule_count,
      COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.type != 'refund' THEN o.amount ELSE 0 END), 0) as revenue
    FROM scripts sc
    LEFT JOIN schedules s ON sc.id = s.script_id
    LEFT JOIN orders o ON s.id = o.schedule_id
    GROUP BY sc.category
    ORDER BY revenue DESC
  `).all();
  
  success(res, categoryStats);
});

router.get('/daily', authenticateToken, requireRole('admin', 'host'), (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const schedules = db.prepare(`
    SELECT 
      s.*, sc.name as script_name, sc.cover_image,
      r.name as room_name, u.name as host_name,
      COUNT(b.id) as booking_count,
      COALESCE(SUM(b.player_count), 0) as player_count
    FROM schedules s
    LEFT JOIN scripts sc ON s.script_id = sc.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN users u ON s.host_id = u.id
    LEFT JOIN bookings b ON s.id = b.schedule_id AND b.status != 'cancelled'
    WHERE DATE(s.start_time) = ?
    GROUP BY s.id
    ORDER BY s.start_time
  `).all(targetDate);
  
  const dayRevenue = (db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type != 'refund' THEN amount ELSE 0 END), 0) as total
    FROM orders
    WHERE DATE(paid_at) = ? AND status = 'paid'
  `).get(targetDate) as { total: number }).total;
  
  const dayRefund = (db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM orders
    WHERE DATE(created_at) = ? AND status = 'refunded' AND type = 'refund'
  `).get(targetDate) as { total: number }).total;
  
  const dayPlayers = (db.prepare(`
    SELECT COALESCE(SUM(player_count), 0) as total
    FROM bookings
    WHERE DATE(checked_in_at) = ? AND status = 'checked_in'
  `).get(targetDate) as { total: number }).total;
  
  success(res, {
    date: targetDate,
    schedules,
    totalSchedules: schedules.length,
    totalRevenue: dayRevenue - dayRefund,
    totalPlayers: dayPlayers
  });
});

export default router;
