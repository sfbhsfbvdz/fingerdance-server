// server/routes/orders.js
const express = require('express')
const router = express.Router()
const db = require('../db')

/**
 * GET /api/orders?userId=xxx
 * 查询指定用户的订单列表（含活动标题、图片、金额）
 */
router.get('/', (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ message: '缺少 userId' })

  const orders = db.prepare(`
    SELECT
      o.id,
      o.activity_id  AS activityId,
      o.status,
      o.amount,
      o.paid_at      AS paidAt,
      o.created_at   AS createdAt,
      a.title        AS activityTitle,
      a.image_url    AS activityImage,
      a.group_price  AS groupPrice
    FROM orders o
    LEFT JOIN activities a ON o.activity_id = a.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(userId)

  res.json(orders)
})

/**
 * GET /api/orders/check?activityId=X&userId=Y
 * 查询用户是否已参团某活动（必须放在 /:id 之前）
 */
router.get('/check', (req, res) => {
  const { activityId, userId } = req.query
  if (!activityId || !userId) return res.status(400).json({ message: '缺少参数' })
  const order = db.prepare(
    "SELECT id, status FROM orders WHERE activity_id = ? AND user_id = ? AND status != 'cancelled' ORDER BY created_at DESC LIMIT 1"
  ).get(activityId, userId)
  res.json({ joined: !!order, status: order ? order.status : null, orderId: order ? order.id : null })
})

/**
 * GET /api/orders/:id
 * 查询单条订单详情
 */
router.get('/:id', (req, res) => {
  const order = db.prepare(`
    SELECT
      o.*,
      a.title       AS activityTitle,
      a.image_url   AS activityImage,
      a.group_price AS groupPrice
    FROM orders o
    LEFT JOIN activities a ON o.activity_id = a.id
    WHERE o.id = ?
  `).get(req.params.id)
  if (!order) return res.status(404).json({ message: '订单不存在' })
  res.json(order)
})

module.exports = router
