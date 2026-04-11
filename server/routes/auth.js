// server/routes/auth.js
// 微信登录：小程序端传来 code，服务端换 openid（不在前端持有 AppSecret）
const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const db = require('../db')

const APP_ID = process.env.WX_APP_ID
const APP_SECRET = process.env.WX_APP_SECRET

/**
 * POST /api/auth/login
 * body: { code }
 * 返回: { openid, token, userInfo }
 */
router.post('/login', async (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ message: '缺少 code' })

  // 云托管内部用 http，外部用 https
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`

  try {
    const wxRes = await fetch(url)
    const json = await wxRes.json()

    if (json.errcode) {
      console.error('[auth] jscode2session error:', json.errcode, json.errmsg)
      return res.status(400).json({ message: json.errmsg || '登录失败', errcode: json.errcode })
    }

    const { openid } = json
    const token = Buffer.from(`${openid}:${Date.now()}`).toString('base64')

    // 记录用户（如不存在则写入）
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      openid TEXT PRIMARY KEY,
      nick_name TEXT,
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )`)
    db.prepare('INSERT OR IGNORE INTO users (openid) VALUES (?)').run(openid)

    res.json({
      openid,
      token,
      userInfo: { openid, nickName: '指尖芭蕾用户' }
    })
  } catch (e) {
    console.error('[auth] fetch error:', e.message)
    res.status(500).json({ message: '网络请求失败', detail: e.message })
  }
})

module.exports = router
