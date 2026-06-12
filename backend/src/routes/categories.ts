import { Router } from 'express';
import db from '../config/database';
import { success, error } from '../utils/response';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Category } from '../database/types';

const router = Router();

router.get('/', (req, res) => {
  const { status } = req.query;

  let sql = `
    SELECT 
      c.*,
      (SELECT COUNT(*) FROM scripts s WHERE s.category = c.name) as script_count,
      (SELECT COUNT(*) FROM scripts s WHERE s.category = c.name AND s.status = 'published') as published_count
    FROM categories c
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY c.created_at DESC';

  const categories = db.prepare(sql).all(...params) as (Category & { script_count: number; published_count: number })[];

  success(res, categories);
});

router.get('/active', (req, res) => {
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

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { name } = req.body;

  if (!name) {
    return error(res, '分类名称不能为空');
  }

  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (existing) {
    return error(res, '分类名称已存在');
  }

  try {
    const info = db.prepare(`
      INSERT INTO categories (name)
      VALUES (?)
    `).run(name);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid) as Category;
    success(res, category, '创建成功');
  } catch (err) {
    error(res, '创建失败');
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;

  if (!name) {
    return error(res, '分类名称不能为空');
  }

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
  if (!existing) {
    return error(res, '分类不存在', 1, 404);
  }

  const nameExists = db.prepare('SELECT id FROM categories WHERE name = ? AND id != ?').get(name, id);
  if (nameExists) {
    return error(res, '分类名称已被使用');
  }

  try {
    db.prepare('UPDATE categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, id);

    if (existing.name !== name) {
      db.prepare('UPDATE scripts SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?').run(name, existing.name);
    }

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;
    success(res, category, '更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.patch('/:id/status', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body as { status: 'active' | 'inactive' };

  if (!['active', 'inactive'].includes(status)) {
    return error(res, '无效的状态');
  }

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
  if (!existing) {
    return error(res, '分类不存在', 1, 404);
  }

  if (status === 'inactive') {
    const publishedCount = db.prepare(`
      SELECT COUNT(*) as count FROM scripts WHERE category = ? AND status = 'published'
    `).get(existing.name) as { count: number };

    if (publishedCount.count > 0) {
      return error(res, '该分类下存在已上架剧本，无法停用');
    }
  }

  try {
    db.prepare('UPDATE categories SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    success(res, { status }, '状态更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
  if (!existing) {
    return error(res, '分类不存在', 1, 404);
  }

  const scriptCount = db.prepare(`
    SELECT COUNT(*) as count FROM scripts WHERE category = ?
  `).get(existing.name) as { count: number };

  if (scriptCount.count > 0) {
    return error(res, '该分类下存在剧本，无法删除');
  }

  try {
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    if (info.changes === 0) {
      return error(res, '分类不存在', 1, 404);
    }
    success(res, null, '删除成功');
  } catch (err) {
    error(res, '删除失败');
  }
});

export default router;
