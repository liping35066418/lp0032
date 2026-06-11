import { Router } from 'express';
import db from '../config/database';
import { success, error, paginated } from '../utils/response';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Drink } from '../database/types';

const router = Router();

router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, category, status = 'active', keyword } = req.query;
  
  let sql = 'SELECT * FROM drinks WHERE 1=1';
  const params: any[] = [];
  
  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    const search = `%${keyword}%`;
    params.push(search, search);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;
  
  sql += ' ORDER BY category, name LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
  
  const drinks = db.prepare(sql).all(...params) as Drink[];
  
  paginated(res, drinks, total, parseInt(page as string), parseInt(pageSize as string));
});

router.get('/categories', authenticateToken, (req, res) => {
  const categories = db.prepare(`
    SELECT DISTINCT category as name, COUNT(*) as count 
    FROM drinks 
    WHERE status = 'active'
    GROUP BY category
  `).all() as { name: string; count: number }[];
  
  success(res, categories);
});

router.get('/:id', (req, res) => {
  const drink = db.prepare('SELECT * FROM drinks WHERE id = ?').get(req.params.id) as Drink | undefined;
  
  if (!drink) {
    return error(res, '饮品不存在', 1, 404);
  }
  
  success(res, drink);
});

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { name, category, price, image, description, status = 'active', stock = 0 } = req.body;
  
  if (!name || !price) {
    return error(res, '饮品名称和价格不能为空');
  }
  
  try {
    const info = db.prepare(`
      INSERT INTO drinks (name, category, price, image, description, status, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, category || null, parseFloat(price), 
      image || null, description || null, status, parseInt(stock)
    );
    
    const drink = db.prepare('SELECT * FROM drinks WHERE id = ?').get(info.lastInsertRowid) as Drink;
    success(res, drink, '创建成功');
  } catch (err) {
    error(res, '创建失败');
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT id FROM drinks WHERE id = ?').get(id);
  
  if (!existing) {
    return error(res, '饮品不存在', 1, 404);
  }
  
  const { name, category, price, image, description, status, stock } = req.body;
  
  try {
    db.prepare(`
      UPDATE drinks SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        price = COALESCE(?, price),
        image = COALESCE(?, image),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        stock = COALESCE(?, stock)
      WHERE id = ?
    `).run(
      name || null, category || null, price ? parseFloat(price) : null,
      image || null, description || null, status || null,
      stock !== undefined ? parseInt(stock) : null, id
    );
    
    const drink = db.prepare('SELECT * FROM drinks WHERE id = ?').get(id) as Drink;
    success(res, drink, '更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.patch('/:id/stock', authenticateToken, requireRole('admin', 'host'), (req, res) => {
  const id = parseInt(req.params.id);
  const { stock, change } = req.body;
  
  const existing = db.prepare('SELECT id, stock FROM drinks WHERE id = ?').get(id);
  if (!existing) {
    return error(res, '饮品不存在', 1, 404);
  }
  
  let newStock: number;
  if (stock !== undefined) {
    newStock = parseInt(stock);
  } else if (change !== undefined) {
    newStock = existing.stock + parseInt(change);
  } else {
    return error(res, '请提供库存数量或变动值');
  }
  
  if (newStock < 0) {
    return error(res, '库存不能为负数');
  }
  
  try {
    db.prepare('UPDATE drinks SET stock = ? WHERE id = ?').run(newStock, id);
    success(res, { stock: newStock }, '库存更新成功');
  } catch (err) {
    error(res, '更新失败');
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    const info = db.prepare('DELETE FROM drinks WHERE id = ?').run(id);
    if (info.changes === 0) {
      return error(res, '饮品不存在', 1, 404);
    }
    success(res, null, '删除成功');
  } catch (err) {
    error(res, '删除失败');
  }
});

export default router;
