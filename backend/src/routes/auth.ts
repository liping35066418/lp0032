import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { JWT_SECRET, TOKEN_EXPIRES_IN } from '../config/env';
import { success, error } from '../utils/response';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { User, UserWithPassword, UserRole } from '../database/types';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return error(res, '用户名和密码不能为空');
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserWithPassword | undefined;
  
  if (!user) {
    return error(res, '用户名或密码错误', 1, 401);
  }

  const isValid = bcrypt.compareSync(password, user.password);
  
  if (!isValid) {
    return error(res, '用户名或密码错误', 1, 401);
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
  
  const { password: _, ...userWithoutPassword } = user;
  
  success(res, {
    user: userWithoutPassword,
    token
  }, '登录成功');
});

router.post('/register', (req, res) => {
  const { username, password, name, phone, role = 'player' } = req.body;
  
  if (!username || !password || !name) {
    return error(res, '用户名、密码和姓名不能为空');
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return error(res, '用户名已存在');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    const info = db.prepare(`
      INSERT INTO users (username, password, name, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, hashedPassword, name, phone || null, role);

    const user = db.prepare('SELECT id, username, name, phone, role, avatar, created_at, updated_at FROM users WHERE id = ?').get(info.lastInsertRowid) as User;
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
    
    success(res, { user, token }, '注册成功');
  } catch (err) {
    error(res, '注册失败');
  }
});

router.get('/profile', authenticateToken, (req: AuthRequest, res) => {
  success(res, req.user, '获取用户信息成功');
});

router.put('/profile', authenticateToken, (req: AuthRequest, res) => {
  const { name, phone, avatar } = req.body;
  const userId = req.user!.id;
  
  try {
    db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name), 
          phone = COALESCE(?, phone), 
          avatar = COALESCE(?, avatar),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name || null, phone || null, avatar || null, userId);
    
    const user = db.prepare('SELECT id, username, name, phone, role, avatar, created_at, updated_at FROM users WHERE id = ?').get(userId) as User;
    success(res, user, '更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  success(res, null, '退出成功');
});

export default router;
