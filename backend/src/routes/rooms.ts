import { Router } from 'express';
import db from '../config/database';
import { success, error, paginated } from '../utils/response';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Room } from '../database/types';

const router = Router();

router.get('/', authenticateToken, (req, res) => {
  const { page = 1, pageSize = 20, status } = req.query;
  
  let sql = 'SELECT * FROM rooms WHERE 1=1';
  const params: any[] = [];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;
  
  sql += ' ORDER BY name LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
  
  const rooms = db.prepare(sql).all(...params) as Room[];
  
  paginated(res, rooms, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/available', authenticateToken, (req, res) => {
  const { start_time, end_time, exclude_schedule_id } = req.query;
  
  let sql = `
    SELECT r.* FROM rooms r
    WHERE r.status = 'active'
  `;
  const params: any[] = [];
  
  if (start_time && end_time) {
    sql += `
      AND r.id NOT IN (
        SELECT s.room_id FROM schedules s
        WHERE s.status != 'cancelled'
        AND s.start_time < ? AND s.end_time > ?
    `;
    params.push(end_time, start_time);
    
    if (exclude_schedule_id) {
      sql += ' AND s.id != ?';
      params.push(parseInt(exclude_schedule_id as string));
    }
    sql += ')';
  }
  
  const rooms = db.prepare(sql).all(...params) as Room[];
  success(res, rooms);
});

router.get('/:id', authenticateToken, (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as Room | undefined;
  
  if (!room) {
    return error(res, '房间不存在', 1, 404);
  }
  
  success(res, room);
});

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { name, capacity, facilities, status = 'active' } = req.body;
  
  if (!name || !capacity) {
    return error(res, '房间名称和容量不能为空');
  }
  
  try {
    const info = db.prepare(`
      INSERT INTO rooms (name, capacity, facilities, status)
      VALUES (?, ?, ?, ?)
    `).run(name, parseInt(capacity), facilities || null, status);
    
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(info.lastInsertRowid) as Room;
    success(res, room, '创建成功');
  } catch (err) {
    error(res, '创建失败');
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT id FROM rooms WHERE id = ?').get(id);
  
  if (!existing) {
    return error(res, '房间不存在', 1, 404);
  }
  
  const { name, capacity, facilities, status } = req.body;
  
  try {
    db.prepare(`
      UPDATE rooms SET
        name = COALESCE(?, name),
        capacity = COALESCE(?, capacity),
        facilities = COALESCE(?, facilities),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || null,
      capacity ? parseInt(capacity) : null,
      facilities || null,
      status || null,
      id
    );
    
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room;
    success(res, room, '更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    const info = db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    if (info.changes === 0) {
      return error(res, '房间不存在', 1, 404);
    }
    success(res, null, '删除成功');
  } catch (err) {
    error(res, '删除失败，可能有关联数据');
  }
});

export default router;
