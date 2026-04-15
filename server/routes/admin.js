// server/routes/admin.js
// 管理后台登录/退出接口
const express = require('express')
const crypto = require('crypto')
const router = express.Router()

// 存储有效 token：token → expireAt（时间戳）
const tokens = new Map()

/**
 * POST /api/admin/login
 * body: { password }
 * 返回: { token } 或 401 密码错误
 */
router.post('/login', (req, res) => {
  const { password } = req.body
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: '密码错误' })
  }
  const token = crypto.randomBytes(32).toString('hex')
  // 24 小时有效
  tokens.set(token, Date.now() + 24 * 60 * 60 * 1000)
  res.json({ token })
})

/**
 * POST /api/admin/logout
 * header: Authorization: Bearer <token>
 */
router.post('/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim()
  tokens.delete(token)
  res.json({ success: true })
})

module.exports = router
module.exports.tokens = tokens
