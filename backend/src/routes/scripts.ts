import { Router } from 'express';
import db from '../config/database';
import { success, error, paginated } from '../utils/response';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { Script, ScriptStatus } from '../database/types';

const router = Router();

router.get('/', (req, res) => {
  const { 
    page = 1, 
    pageSize = 10, 
    category, 
    difficulty, 
    status, 
    keyword,
    minPlayers,
    maxPlayers
  } = req.query;

  let sql = 'SELECT * FROM scripts WHERE 1=1';
  const params: any[] = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (difficulty) {
    sql += ' AND difficulty = ?';
    params.push(difficulty);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
    const search = `%${keyword}%`;
    params.push(search, search, search);
  }
  if (minPlayers) {
    sql += ' AND min_players >= ?';
    params.push(parseInt(minPlayers as string));
  }
  if (maxPlayers) {
    sql += ' AND max_players <= ?';
    params.push(parseInt(maxPlayers as string));
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;

  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));

  const scripts = db.prepare(sql).all(...params) as Script[];
  
  paginated(res, scripts, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT 
      c.name,
      (SELECT COUNT(*) FROM scripts s WHERE s.category = c.name AND s.status = 'published') as count
    FROM categories c
    WHERE c.status = 'active'
    ORDER BY c.name
  `).all() as { name: string; count: number }[];
  
  success(res, categories);
});

router.get('/:id', (req, res) => {
  const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id) as Script | undefined;
  
  if (!script) {
    return error(res, '剧本不存在', 1, 404);
  }
  
  success(res, script);
});

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { 
    name, description, category, difficulty, 
    min_players, max_players, duration, base_price,
    cover_image, tags, materials, author, publisher
  } = req.body;

  if (!name || !category || !difficulty || !min_players || !max_players || !duration || !base_price) {
    return error(res, '必填字段不能为空');
  }

  try {
    const info = db.prepare(`
      INSERT INTO scripts (name, description, category, difficulty, min_players, max_players, duration, base_price, cover_image, tags, materials, author, publisher)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, description || null, category, difficulty, 
      parseInt(min_players), parseInt(max_players), parseInt(duration), parseFloat(base_price),
      cover_image || null, tags || null, materials || null, author || null, publisher || null
    );
    
    const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(info.lastInsertRowid) as Script;
    success(res, script, '创建成功');
  } catch (err) {
    error(res, '创建失败');
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT id FROM scripts WHERE id = ?').get(id);
  
  if (!existing) {
    return error(res, '剧本不存在', 1, 404);
  }

  const { 
    name, description, category, difficulty, 
    min_players, max_players, duration, base_price,
    cover_image, tags, materials, author, publisher, status
  } = req.body;

  try {
    db.prepare(`
      UPDATE scripts SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        difficulty = COALESCE(?, difficulty),
        min_players = COALESCE(?, min_players),
        max_players = COALESCE(?, max_players),
        duration = COALESCE(?, duration),
        base_price = COALESCE(?, base_price),
        cover_image = COALESCE(?, cover_image),
        tags = COALESCE(?, tags),
        materials = COALESCE(?, materials),
        author = COALESCE(?, author),
        publisher = COALESCE(?, publisher),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || null, description || null, category || null, difficulty || null,
      min_players ? parseInt(min_players) : null,
      max_players ? parseInt(max_players) : null,
      duration ? parseInt(duration) : null,
      base_price ? parseFloat(base_price) : null,
      cover_image || null, tags || null, materials || null, author || null, publisher || null,
      status || null, id
    );
    
    const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(id) as Script;
    success(res, script, '更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.patch('/:id/status', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body as { status: ScriptStatus };
  
  if (!['draft', 'published', 'offline'].includes(status)) {
    return error(res, '无效的状态');
  }

  const existing = db.prepare('SELECT id FROM scripts WHERE id = ?').get(id);
  if (!existing) {
    return error(res, '剧本不存在', 1, 404);
  }

  try {
    db.prepare('UPDATE scripts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    success(res, { status }, '状态更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.post('/batch/status', authenticateToken, requireRole('admin'), (req, res) => {
  const { ids, status } = req.body as { ids: number[]; status: ScriptStatus };
  
  if (!ids || ids.length === 0) {
    return error(res, '请选择要操作的剧本');
  }
  if (!['draft', 'published', 'offline'].includes(status)) {
    return error(res, '无效的状态');
  }

  const placeholders = ids.map(() => '?').join(',');
  
  try {
    const info = db.prepare(`UPDATE scripts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(status, ...ids);
    success(res, { updated: info.changes }, `成功更新 ${info.changes} 个剧本`);
  } catch (err) {
    error(res, '批量操作失败');
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    const info = db.prepare('DELETE FROM scripts WHERE id = ?').run(id);
    if (info.changes === 0) {
      return error(res, '剧本不存在', 1, 404);
    }
    success(res, null, '删除成功');
  } catch (err) {
    error(res, '删除失败，可能有关联数据');
  }
});

export default router;
