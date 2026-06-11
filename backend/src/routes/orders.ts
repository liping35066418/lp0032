import { Router } from 'express';
import db from '../config/database';
import { success, error, paginated } from '../utils/response';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { 
    page = 1, 
    pageSize = 20, 
    status, 
    type, 
    start_date, 
    end_date,
    user_id
  } = req.query;
  const currentUser = req.user!;
  
  let sql = `
    SELECT o.*, u.name as user_name, u.phone as user_phone,
           s.start_time, s.end_time,
           sc.name as script_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN schedules s ON o.schedule_id = s.id
    LEFT JOIN scripts sc ON s.script_id = sc.id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (currentUser.role === 'player') {
    sql += ' AND o.user_id = ?';
    params.push(currentUser.id);
  } else if (user_id) {
    sql += ' AND o.user_id = ?';
    params.push(parseInt(user_id as string));
  }
  
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (type) {
    sql += ' AND o.type = ?';
    params.push(type);
  }
  if (start_date) {
    sql += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }
  
  const countSql = sql.replace(/SELECT o\.[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;
  
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
  
  const orders = db.prepare(sql).all(...params);
  
  paginated(res, orders, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/my', authenticateToken, (req: AuthRequest, res) => {
  const { page = 1, pageSize = 20, status, type } = req.query;
  const userId = req.user!.id;
  
  let sql = `
    SELECT o.*, s.start_time, s.end_time,
           sc.name as script_name, sc.cover_image,
           r.name as room_name
    FROM orders o
    LEFT JOIN schedules s ON o.schedule_id = s.id
    LEFT JOIN scripts sc ON s.script_id = sc.id
    LEFT JOIN rooms r ON s.room_id = r.id
    WHERE o.user_id = ?
  `;
  const params: any[] = [userId];
  
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (type) {
    sql += ' AND o.type = ?';
    params.push(type);
  }
  
  const countSql = sql.replace(/SELECT o\.[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;
  
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
  
  const orders = db.prepare(sql).all(...params);
  
  paginated(res, orders, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/:id', authenticateToken, (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const currentUser = req.user!;
  
  const order = db.prepare(`
    SELECT o.*, u.name as user_name, u.phone as user_phone,
           s.start_time, s.end_time,
           sc.name as script_name,
           r.name as room_name,
           host.name as host_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN schedules s ON o.schedule_id = s.id
    LEFT JOIN scripts sc ON s.script_id = sc.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN users host ON s.host_id = host.id
    WHERE o.id = ?
  `).get(id) as any;
  
  if (!order) {
    return error(res, '订单不存在', 1, 404);
  }
  
  if (currentUser.role === 'player' && order.user_id !== currentUser.id) {
    return error(res, '无权查看该订单', 1, 403);
  }
  
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  
  success(res, order);
});

router.post('/:id/pay', authenticateToken, (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { payment_method = 'wechat' } = req.body;
  const currentUser = req.user!;
  
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) {
    return error(res, '订单不存在', 1, 404);
  }
  
  if (currentUser.role === 'player' && order.user_id !== currentUser.id) {
    return error(res, '无权支付该订单', 1, 403);
  }
  
  if (order.status !== 'pending') {
    return error(res, '该订单状态不允许支付');
  }
  
  try {
    db.prepare(`
      UPDATE orders 
      SET status = 'paid', paid_at = datetime('now'), payment_method = ?
      WHERE id = ?
    `).run(payment_method, id);
    
    success(res, null, '支付成功');
  } catch (err) {
    error(res, '支付失败');
  }
});

router.post('/:id/refund', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const { reason } = req.body;
  
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) {
    return error(res, '订单不存在', 1, 404);
  }
  
  if (order.type === 'refund') {
    return error(res, '该订单为退款订单，无法再次退款');
  }
  
  if (order.status === 'refunded' || order.status === 'cancelled') {
    return error(res, '该订单已退款或已取消');
  }
  
  const tx = db.transaction(() => {
    const refundOrderNo = `REF${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    db.prepare(`
      INSERT INTO orders (order_no, user_id, schedule_id, booking_id, type, amount, status, paid_at, payment_method)
      VALUES (?, ?, ?, ?, 'refund', ?, 'refunded', datetime('now'), 'manual')
    `).run(refundOrderNo, order.user_id, order.schedule_id, order.booking_id, order.amount);
    
    db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(id);
    
    if (order.booking_id) {
      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(order.booking_id);
    }
  });
  
  try {
    tx();
    success(res, null, '退款成功');
  } catch (err) {
    error(res, '退款失败');
  }
});

router.post('/onsite', authenticateToken, requireRole('admin', 'host'), (req: AuthRequest, res) => {
  const { user_id, schedule_id, items, payment_method = 'onsite' } = req.body;
  
  if (!items || items.length === 0) {
    return error(res, '请添加消费项目');
  }
  
  let totalAmount = 0;
  for (const item of items) {
    if (!item.item_name || !item.quantity || !item.unit_price) {
      return error(res, '消费项目信息不完整');
    }
    totalAmount += item.quantity * item.unit_price;
  }
  
  const tx = db.transaction(() => {
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const orderInfo = db.prepare(`
      INSERT INTO orders (order_no, user_id, schedule_id, type, amount, status, paid_at, payment_method)
      VALUES (?, ?, ?, 'package', ?, 'paid', datetime('now'), ?)
    `).run(orderNo, user_id || req.user!.id, schedule_id || null, totalAmount, payment_method);
    
    for (const item of items) {
      db.prepare(`
        INSERT INTO order_items (order_id, item_type, item_name, quantity, unit_price, subtotal, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderInfo.lastInsertRowid,
        item.item_type || 'other',
        item.item_name,
        parseInt(item.quantity),
        parseFloat(item.unit_price),
        parseInt(item.quantity) * parseFloat(item.unit_price),
        item.description || null
      );
    }
    
    return { orderId: orderInfo.lastInsertRowid, orderNo, amount: totalAmount };
  });
  
  try {
    const result = tx();
    success(res, result, '结算成功');
  } catch (err) {
    error(res, '结算失败');
  }
});

export default router;
