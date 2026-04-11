// server/db.js - SQLite 数据库初始化 & 模拟数据
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, 'fingerdance.db'))

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    original_price REAL NOT NULL,
    group_price REAL NOT NULL,
    min_participants INTEGER NOT NULL DEFAULT 10,
    current_participants INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    tags TEXT DEFAULT '[]',
    start_time TEXT,
    end_time TEXT,
    created_at TEXT DEFAULT (datetime('now', '+8 hours'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    status TEXT NOT NULL DEFAULT 'unpaid',
    -- 支付相关
    out_trade_no TEXT UNIQUE,
    transaction_id TEXT,
    amount REAL,
    paid_at TEXT,
    -- 推客追踪：记录是谁分享的链接带来了这笔订单
    referrer_id TEXT,
    created_at TEXT DEFAULT (datetime('now', '+8 hours')),
    FOREIGN KEY (activity_id) REFERENCES activities(id)
  );

  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER,
    date TEXT NOT NULL,
    hour INTEGER NOT NULL DEFAULT 0,
    count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', '+8 hours'))
  );
`)

// 只在表为空时写入模拟数据
const count = db.prepare('SELECT COUNT(*) as c FROM activities').get().c
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO activities (title, description, image_url, original_price, group_price, min_participants, current_participants, status, tags, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const activities = [
    ['春日光疗美甲套餐', '🌸 春日新款光疗美甲，专业美甲师手工打造\n\n✨ 套餐内容：\n• 基础修型 + 打磨\n• 光疗甲 1 套（含款式选择）\n• 后续护理保养\n\n⏰ 有效期：30天内使用\n\n💕 需提前预约，拼团成功后联系客服排期', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80', 198, 99, 30, 28, 'active', JSON.stringify(['拼团价', '限时']), '2026-04-05'],
    ['深层补水护肤体验', '💧 深层补水焕颜护肤套餐，适合干燥、暗沉肌肤\n\n✨ 套餐内容：\n• 深层清洁\n• 精华导入\n• 补水面膜\n• 后期锁水护理\n\n⏰ 时长约 90 分钟', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80', 268, 128, 20, 15, 'active', JSON.stringify(['新客专享']), '2026-04-03'],
    ['精致手足护理套餐', '✨ 手足同护，焕发细腻光彩\n\n套餐内容：\n• 去角质磨砂\n• 保湿护理\n• 美甲修型\n• 补水锁色', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80', 158, 78, 40, 42, 'active', JSON.stringify(['团长推荐', '超值']), '2026-04-10'],
    ['眉眼全套造型设计', '👁 专业眉眼设计，提升面部立体感\n\n包含：\n• 眉型设计 + 修眉\n• 眼线设计\n• 睫毛嫁接（50根）', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80', 328, 158, 15, 8, 'active', JSON.stringify(['新品']), '2026-04-08'],
    ['夏日防晒美白套餐', '🌞 夏日来临，美白防晒全护理\n\n套餐包含：\n• 深层清洁敷面\n• 美白精华导入\n• 防晒保湿护理', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80', 358, 168, 20, 0, 'pending', JSON.stringify(['预售']), '2026-04-15'],
    ['冬日滋润护手套餐', '❄️ 冬日护手专项护理，告别干裂', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80', 128, 58, 40, 56, 'ended', JSON.stringify(['已结束']), '2026-03-20']
  ]

  const insertMany = db.transaction((rows) => rows.forEach(r => insert.run(...r)))
  insertMany(activities)

  // 模拟 7 天的访问数据
  const insertView = db.prepare('INSERT INTO page_views (activity_id, date, hour, count) VALUES (?, ?, ?, ?)')
  const today = new Date()
  for (let d = 6; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    const dateStr = date.toISOString().split('T')[0]
    // 每天模拟几条峰值记录
    const peaks = [10, 14, 19, 20] // 早午晚高峰
    peaks.forEach(hour => {
      const baseCount = Math.floor(Math.random() * 80) + 30
      insertView.run(null, dateStr, hour, baseCount)
    })
  }

  console.log('✅ 模拟数据写入完成')
}

module.exports = db
