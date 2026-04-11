// server/routes/stats.js
const express = require('express')
const router = express.Router()
const db = require('../db')

// POST /api/stats/pageview - 记录访问
router.post('/pageview', (req, res) => {
  const { activityId } = req.body
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const hour = now.getHours()

  // 当天同小时的记录存在则 +1，否则新建
  const existing = db.prepare(
    'SELECT id FROM page_views WHERE date = ? AND hour = ? AND activity_id IS ?'
  ).get(date, hour, activityId || null)

  if (existing) {
    db.prepare('UPDATE page_views SET count = count + 1 WHERE id = ?').run(existing.id)
  } else {
    db.prepare('INSERT INTO page_views (activity_id, date, hour, count) VALUES (?, ?, ?, 1)')
      .run(activityId || null, date, hour)
  }
  res.json({ success: true })
})

// GET /api/stats/overview - 管理后台总览数据
router.get('/overview', (req, res) => {
  const today = new Date().toISOString().split('T')[0]

  const todayViews = db.prepare(
    'SELECT COALESCE(SUM(count), 0) as total FROM page_views WHERE date = ?'
  ).get(today).total

  const totalActivities = db.prepare('SELECT COUNT(*) as c FROM activities').get().c
  const activeActivities = db.prepare("SELECT COUNT(*) as c FROM activities WHERE status = 'active'").get().c
  const pendingActivities = db.prepare("SELECT COUNT(*) as c FROM activities WHERE status = 'pending'").get().c
  const totalOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status NOT IN ('unpaid', 'cancelled')").get().c

  // 新成员（今天新增订单的去重用户数）
  const newMembers = db.prepare(
    "SELECT COUNT(DISTINCT user_id) as c FROM orders WHERE date(created_at) = ?"
  ).get(today).c

  res.json({
    todayViews,
    totalActivities,
    activeActivities,
    pendingActivities,
    totalOrders,
    newMembers
  })
})

// GET /api/stats/trend?days=7 - 近 N 天访问趋势
router.get('/trend', (req, res) => {
  const days = parseInt(req.query.days) || 7
  const result = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const views = db.prepare(
      'SELECT COALESCE(SUM(count), 0) as total FROM page_views WHERE date = ?'
    ).get(dateStr).total
    const orders = db.prepare(
      "SELECT COUNT(*) as c FROM orders WHERE date(created_at) = ? AND status NOT IN ('unpaid', 'cancelled')"
    ).get(dateStr).c

    result.push({ date: dateStr, views, orders })
  }

  res.json(result)
})

// GET /api/stats/activities - 各活动参团人数统计（管理后台柱状图）
router.get('/activities', (req, res) => {
  const rows = db.prepare(`
    SELECT id, title, current_participants, min_participants, status
    FROM activities ORDER BY current_participants DESC LIMIT 10
  `).all()
  res.json(rows)
})

// GET /api/stats/orders - 订单列表（含推客字段）
router.get('/orders', (req, res) => {
  const orders = db.prepare(`
    SELECT o.id, o.activity_id, o.user_id, o.user_name, o.status,
           o.amount, o.transaction_id, o.paid_at, o.referrer_id, o.created_at,
           a.title as activity_title, a.group_price
    FROM orders o
    LEFT JOIN activities a ON o.activity_id = a.id
    ORDER BY o.created_at DESC LIMIT 100
  `).all()
  res.json(orders)
})

// POST /api/orders - 创建订单
router.post('/orders', (req, res) => {
  const { activityId, userInfo } = req.body
  if (!activityId) return res.status(400).json({ message: '缺少活动ID' })

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId)
  if (!activity) return res.status(404).json({ message: '活动不存在' })
  if (activity.status !== 'active') return res.status(400).json({ message: '活动未开放' })

  const userId = userInfo?.openid || 'anonymous_' + Date.now()
  const userName = userInfo?.nickName || '匿名用户'

  // 同一用户不重复参团（unpaid = 未完成支付，允许替换）
  const existing = db.prepare(
    "SELECT id FROM orders WHERE activity_id = ? AND user_id = ? AND status NOT IN ('unpaid', 'cancelled')"
  ).get(activityId, userId)
  if (existing) return res.status(400).json({ message: '您已参团，请勿重复参加' })

  db.prepare(
    'INSERT INTO orders (activity_id, user_id, user_name, status) VALUES (?, ?, ?, ?)'
  ).run(activityId, userId, userName, 'pending')

  // 更新参团人数
  db.prepare('UPDATE activities SET current_participants = current_participants + 1 WHERE id = ?').run(activityId)

  // 检查是否达到成团人数
  const updated = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId)
  if (updated.current_participants >= updated.min_participants) {
    db.prepare("UPDATE orders SET status = 'success' WHERE activity_id = ? AND status = 'pending'").run(activityId)
  }

  res.status(201).json({ success: true, message: '参团成功' })
})

module.exports = router
