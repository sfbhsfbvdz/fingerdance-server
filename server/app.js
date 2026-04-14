// server/app.js
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// 路由
app.use('/api/auth', require('./routes/auth'))
app.use('/api/activities', require('./routes/activities'))
app.use('/api/stats', require('./routes/stats'))
app.use('/api/orders', require('./routes/orders'))
app.use('/api/payment', require('./routes/payment'))
app.use('/api/security', require('./routes/security'))

// 兼容旧数据库：若缺少新字段则自动补上
const db = require('./db')
// 兼容旧数据库：若缺少新字段则自动补上（amount 用 REAL 存数值）
const colDefs = {
  out_trade_no: 'TEXT',
  transaction_id: 'TEXT',
  amount: 'REAL',
  paid_at: 'TEXT',
  referrer_id: 'TEXT'
}
Object.entries(colDefs).forEach(([col, type]) => {
  try { db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${type}`) } catch {}
})

// 根路径说明
app.get('/', (req, res) => res.json({
  name: '指尖芭蕾美甲美容 API',
  status: 'running',
  endpoints: {
    activities: '/api/activities',
    stats: '/api/stats/overview',
    trend: '/api/stats/trend?days=7',
    health: '/health'
  },
  tip: '管理后台请直接用浏览器打开 admin/index.html'
}))

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

app.listen(PORT, () => {
  console.log(`🌸 指尖芭蕾后端服务启动 → http://localhost:${PORT}`)
})
