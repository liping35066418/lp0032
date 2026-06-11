import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import { success, error, paginated } from '../utils/response';
import { authenticateToken, requireRole } from '../middleware/auth';
import { User, UserRole } from '../database/types';

const router = Router();

router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { page = 1, pageSize = 20, role, keyword } = req.query;
  
  let sql = 'SELECT id, username, name, phone, role, avatar, created_at, updated_at FROM users WHERE 1=1';
  const params: any[] = [];
  
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR username LIKE ? OR phone LIKE ?)';
    const search = `%${keyword}%`;
    params.push(search, search, search);
  }
  
  const countSql = sql.replace('SELECT id, username, name, phone, role, avatar, created_at, updated_at', 'SELECT COUNT(*) as count');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
  
  const users = db.prepare(sql).all(...params) as User[];
  
  paginated(res, users, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/hosts', authenticateToken, (req, res) => {
  const { available, start_time, end_time, exclude_schedule_id } = req.query;
  
  let sql = `
    SELECT id, username, name, phone, avatar FROM users 
    WHERE role = 'host'
  `;
  const params: any[] = [];
  
  if (available && start_time && end_time) {
    sql += `
      AND id NOT IN (
        SELECT host_id FROM schedules
        WHERE status != 'cancelled'
        AND start_time < ? AND end_time > ?
    `;
    params.push(end_time, start_time);
    
    if (exclude_schedule_id) {
      sql += ' AND id != ?';
      params.push(parseInt(exclude_schedule_id as string));
    }
    sql += ')';
  }
  
  const hosts = db.prepare(sql).all(...params) as User[];
  success(res, hosts);
});

router.get('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const user = db.prepare('SELECT id, username, name, phone, role, avatar, created_at, updated_at FROM users WHERE id = ?').get(req.params.id) as User | undefined;
  
  if (!user) {
    return error(res, '用户不存在', 1, 404);
  }
  
  success(res, user);
});

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { username, password, name, phone, role, avatar } = req.body;
  
  if (!username || !password || !name || !role) {
    return error(res, '必填字段不能为空');
  }
  
  if (!['admin', 'host', 'player'].includes(role)) {
    return error(res, '无效的角色');
  }
  
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return error(res, '用户名已存在');
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    const info = db.prepare(`
      INSERT INTO users (username, password, name, phone, role, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username, hashedPassword, name, phone || null, role, avatar || null);
    
    const user = db.prepare('SELECT id, username, name, phone, role, avatar, created_at, updated_at FROM users WHERE id = ?').get(info.lastInsertRowid) as User;
    success(res, user, '创建成功');
  } catch (err) {
    error(res, '创建失败');
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  
  if (!existing) {
    return error(res, '用户不存在', 1, 404);
  }
  
  const { name, phone, role, avatar, password } = req.body;
  
  if (role && !['admin', 'host', 'player'].includes(role)) {
    return error(res, '无效的角色');
  }
  
  try {
    let updateSql = `
      UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        avatar = COALESCE(?, avatar),
        updated_at = CURRENT_TIMESTAMP
    `;
    const updateParams: any[] = [name || null, phone || null, role || null, avatar || null];
    
    if (password) {
      updateSql += ', password = ?';
      updateParams.push(bcrypt.hashSync(password, 10));
    }
    
    updateSql += ' WHERE id = ?';
    updateParams.push(id);
    
    db.prepare(updateSql).run(...updateParams);
    
    const user = db.prepare('SELECT id, username, name, phone, role, avatar, created_at, updated_at FROM users WHERE id = ?').get(id) as User;
    success(res, user, '更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (info.changes === 0) {
      return error(res, '用户不存在', 1, 404);
    }
    success(res, null, '删除成功');
  } catch (err) {
    error(res, '删除失败，可能有关联数据');
  }
});

export default router;
