import bcrypt from 'bcryptjs';
import db from './config/database';
import { initDatabase } from './database/schema';

initDatabase();

const seedData = () => {
  console.log('开始初始化数据...');
  
  const hashedPassword = bcrypt.hashSync('123456', 10);
  
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, name, phone, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  insertUser.run('admin', hashedPassword, '系统管理员', '13800138000', 'admin');
  insertUser.run('host1', hashedPassword, '主持人小明', '13800138001', 'host');
  insertUser.run('host2', hashedPassword, '主持人小红', '13800138002', 'host');
  insertUser.run('host3', hashedPassword, '主持人小刚', '13800138003', 'host');
  insertUser.run('player1', hashedPassword, '玩家张三', '13900139001', 'player');
  insertUser.run('player2', hashedPassword, '玩家李四', '13900139002', 'player');
  insertUser.run('player3', hashedPassword, '玩家王五', '13900139003', 'player');
  
  console.log('用户数据初始化完成');
  
  const insertRoom = db.prepare(`
    INSERT OR IGNORE INTO rooms (name, capacity, facilities, status)
    VALUES (?, ?, ?, ?)
  `);
  
  insertRoom.run('古风厅', 8, '古风装修、音响、投影', 'active');
  insertRoom.run('现代厅', 10, '现代简约、音响、白板', 'active');
  insertRoom.run('恐怖厅', 6, '恐怖主题、特效灯光', 'active');
  insertRoom.run('日式厅', 8, '日式榻榻米、和服', 'active');
  insertRoom.run('科幻厅', 10, '科幻主题、VR设备', 'active');
  
  console.log('房间数据初始化完成');
  
  const insertScript = db.prepare(`
    INSERT OR IGNORE INTO scripts (name, description, category, difficulty, min_players, max_players, duration, base_price, status, tags, author, publisher)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertScript.run(
    '《雾都疑云》',
    '19世纪伦敦，连环杀人案笼罩着整个城市。你和队友们需要在迷雾中寻找真相...',
    '悬疑推理',
    'hard',
    5, 8, 240, 128, 'published',
    '悬疑,推理,硬核',
    '张三',
    '迷雾出版社'
  );
  
  insertScript.run(
    '《古宅惊魂》',
    '一座百年古宅，传说中闹鬼不断。你们受邀前来探险，却发现了惊人的秘密...',
    '恐怖惊悚',
    'nightmare',
    4, 6, 180, 158, 'published',
    '恐怖,微恐,情感',
    '李四',
    '惊魂工作室'
  );
  
  insertScript.run(
    '《时光倒流》',
    '穿越回过去，改变命运。但每一次改变都会带来意想不到的后果...',
    '科幻穿越',
    'medium',
    6, 10, 300, 168, 'published',
    '科幻,穿越,机制',
    '王五',
    '时空工作室'
  );
  
  insertScript.run(
    '《豪门恩怨》',
    '豪门家族的遗产争夺，每个人都有不可告人的秘密。谁才是真正的凶手？',
    '情感沉浸',
    'medium',
    6, 8, 240, 138, 'published',
    '情感,沉浸,民国',
    '赵六',
    '情感剧本社'
  );
  
  insertScript.run(
    '《星际迷航》',
    '太空探险，你们是宇宙飞船上的船员。一个紧急任务让你们陷入了危机...',
    '科幻机制',
    'easy',
    5, 7, 180, 108, 'published',
    '科幻,机制,欢乐',
    '钱七',
    '星际工作室'
  );
  
  insertScript.run(
    '《血色婚礼》',
    '一场看似完美的婚礼，却暗藏杀机。新娘死在了洞房花烛夜...',
    '悬疑推理',
    'hard',
    6, 9, 270, 148, 'published',
    '悬疑,推理,本格',
    '孙八',
    '推理堂'
  );
  
  insertScript.run(
    '《仙侠奇缘》',
    '修仙界的恩怨情仇，你将扮演一位修仙者，在正道与魔道之间做出选择...',
    '仙侠玄幻',
    'medium',
    5, 8, 300, 158, 'draft',
    '仙侠,玄幻,RPG',
    '周九',
    '仙侠阁'
  );
  
  console.log('剧本数据初始化完成');
  
  const selectCategories = db.prepare(`
    SELECT DISTINCT category FROM scripts
  `);
  const categories = selectCategories.all() as { category: string }[];
  
  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name)
    VALUES (?)
  `);
  
  for (const cat of categories) {
    insertCategory.run(cat.category);
  }
  
  console.log('分类数据初始化完成');
  
  const insertDrink = db.prepare(`
    INSERT OR IGNORE INTO drinks (name, category, price, description, status, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertDrink.run('矿泉水', '饮品', 5, '瓶装矿泉水', 'active', 100);
  insertDrink.run('可乐', '饮品', 8, '罐装可乐', 'active', 100);
  insertDrink.run('雪碧', '饮品', 8, '罐装雪碧', 'active', 100);
  insertDrink.run('柠檬水', '饮品', 12, '鲜榨柠檬水', 'active', 50);
  insertDrink.run('美式咖啡', '咖啡', 18, '美式咖啡', 'active', 50);
  insertDrink.run('拿铁咖啡', '咖啡', 22, '拿铁咖啡', 'active', 50);
  insertDrink.run('卡布奇诺', '咖啡', 22, '卡布奇诺', 'active', 50);
  insertDrink.run('奶茶', '奶茶', 15, '原味奶茶', 'active', 60);
  insertDrink.run('珍珠奶茶', '奶茶', 18, '珍珠奶茶', 'active', 60);
  insertDrink.run('爆米花', '零食', 15, '桶装爆米花', 'active', 80);
  insertDrink.run('薯条', '零食', 12, '薯条', 'active', 80);
  insertDrink.run('鸡米花', '零食', 18, '鸡米花', 'active', 60);
  
  console.log('饮品数据初始化完成');
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  
  const formatDateTime = (date: Date, hours: number, minutes: number) => {
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };
  
  const insertSchedule = db.prepare(`
    INSERT OR IGNORE INTO schedules (script_id, room_id, host_id, start_time, end_time, min_players, max_players, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertSchedule.run(
    1, 1, 2,
    formatDateTime(tomorrow, 14, 0),
    formatDateTime(tomorrow, 18, 0),
    5, 8, 'pending', '周末下午场'
  );
  
  insertSchedule.run(
    2, 3, 3,
    formatDateTime(tomorrow, 19, 0),
    formatDateTime(tomorrow, 22, 0),
    4, 6, 'pending', '周末夜场恐怖本'
  );
  
  insertSchedule.run(
    4, 4, 4,
    formatDateTime(dayAfter, 14, 0),
    formatDateTime(dayAfter, 18, 0),
    6, 8, 'pending', '周日情感本'
  );
  
  insertSchedule.run(
    5, 5, 2,
    formatDateTime(dayAfter, 19, 0),
    formatDateTime(dayAfter, 22, 0),
    5, 7, 'pending', '周日晚场'
  );
  
  insertSchedule.run(
    6, 2, 3,
    formatDateTime(tomorrow, 10, 0),
    formatDateTime(tomorrow, 14, 30),
    6, 9, 'pending', '周六上午场'
  );
  
  console.log('场次数据初始化完成');
  
  console.log('\n数据初始化完成！');
  console.log('\n测试账号：');
  console.log('管理员: admin / 123456');
  console.log('主持人: host1 / 123456');
  console.log('玩家: player1 / 123456');
};

try {
  seedData();
} catch (err) {
  console.error('数据初始化失败:', err);
  process.exit(1);
}
