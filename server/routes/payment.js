// server/routes/payment.js
const express = require('express')
const router = express.Router()
const db = require('../db')
const { unifiedOrder, verifyNotify, fromXml } = require('../utils/wxpay')

/**
 * POST /api/payment/prepay
 * 小程序端调起支付前，先请求此接口拿到签名参数
 * body: { activityId, openid, referrerId? }
 */
router.post('/prepay', async (req, res) => {
  const { activityId, openid, referrerId } = req.body

  if (!activityId || !openid) {
    return res.status(400).json({ message: '缺少参数 activityId 或 openid' })
  }

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId)
  if (!activity) return res.status(404).json({ message: '活动不存在' })
  if (activity.status !== 'active') return res.status(400).json({ message: '活动未开放' })

  // 生成唯一商户订单号（20位以内）
  const outTradeNo = `FD${activityId}${Date.now().toString().slice(-10)}`
  const totalFee = Math.round(activity.group_price * 100) // 转为分

  // 用事务保证：检查 → 删旧 → 插新 原子执行，防止并发重复下单
  let insertResult
  try {
    insertResult = db.transaction(() => {
      const activeOrder = db.prepare(
        "SELECT id FROM orders WHERE activity_id = ? AND user_id = ? AND status NOT IN ('unpaid', 'cancelled')"
      ).get(activityId, openid)
      if (activeOrder) throw Object.assign(new Error('您已参团，请勿重复参加'), { code: 'DUPLICATE' })

      db.prepare(
        "DELETE FROM orders WHERE activity_id = ? AND user_id = ? AND status = 'unpaid'"
      ).run(activityId, openid)

      return db.prepare(`
        INSERT INTO orders (activity_id, user_id, status, referrer_id, out_trade_no, amount)
        VALUES (?, ?, 'unpaid', ?, ?, ?)
      `).run(activityId, openid, referrerId || null, outTradeNo, activity.group_price)
    })()
  } catch (err) {
    if (err.code === 'DUPLICATE') return res.status(400).json({ message: err.message })
    throw err
  }

  try {
    const payParams = await unifiedOrder({
      outTradeNo,
      totalFee,
      body: activity.title,
      openid,
    })
    res.json({ orderId: insertResult.lastInsertRowid, ...payParams })
  } catch (err) {
    // 下单失败，删除刚插入的订单记录
    db.prepare('DELETE FROM orders WHERE id = ?').run(insertResult.lastInsertRowid)
    res.status(500).json({ message: err.message })
  }
})

/**
 * POST /api/payment/notify
 * 微信支付结果回调（微信服务器主动推送，非用户请求）
 * 微信要求返回 XML 格式
 */
router.post('/notify', express.text({ type: 'text/xml' }), (req, res) => {
  const params = fromXml(req.body)

  // 1. 验签
  if (!verifyNotify(params)) {
    return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名失败]]></return_msg></xml>')
  }

  // 2. 检查支付结果
  if (params.return_code === 'SUCCESS' && params.result_code === 'SUCCESS') {
    const { out_trade_no, transaction_id } = params

    // 用事务保证原子性，防止重复回调导致参团人数多加
    db.transaction(() => {
      const order = db.prepare("SELECT * FROM orders WHERE out_trade_no = ?").get(out_trade_no)
      if (!order || order.status !== 'unpaid') return

      // 3. 更新订单状态为已支付（pending = 等待成团）
      db.prepare(`
        UPDATE orders SET status = 'pending', transaction_id = ?, paid_at = datetime('now', '+8 hours')
        WHERE out_trade_no = ?
      `).run(transaction_id, out_trade_no)

      // 4. 更新活动参团人数
      db.prepare('UPDATE activities SET current_participants = current_participants + 1 WHERE id = ?')
        .run(order.activity_id)

      // 5. 检查是否达到成团人数，达到则批量更新订单为已成团
      const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(order.activity_id)
      if (activity.current_participants >= activity.min_participants) {
        db.prepare("UPDATE orders SET status = 'success' WHERE activity_id = ? AND status = 'pending'")
          .run(order.activity_id)
      }
    })()
  }

  // 微信要求必须返回 SUCCESS 否则会重复推送
  res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>')
})

/**
 * GET /api/payment/status/:orderId
 * 小程序轮询查询订单支付状态
 */
router.get('/status/:orderId', (req, res) => {
  const order = db.prepare('SELECT id, status, paid_at FROM orders WHERE id = ?').get(req.params.orderId)
  if (!order) return res.status(404).json({ message: '订单不存在' })
  res.json(order)
})

module.exports = router
