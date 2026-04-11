// server/routes/auth.js
// 微信登录：小程序端传来 code，服务端换 openid（不在前端持有 AppSecret）
const express = require('express')
const router = express.Router()
const https = require('https')
const db = require('../db')

const APP_ID = process.env.WX_APP_ID || 'wx805ec7bc2c34ec27'
const APP_SECRET = process.env.WX_APP_SECRET || '630191b0514f1026a6ccaedea3faf1d5'

/**
 * POST /api/auth/login
 * body: { code }
 * 返回: { openid, token, userInfo }
 */
router.post('/login', (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ message: '缺少 code' })

  // 用 code 换 openid（服务端请求，AppSecret 不暴露给前端）
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`

  https.get(url, (wxRes) => {
    let data = ''
    wxRes.on('data', chunk => data += chunk)
    wxRes.on('end', () => {
      try {
        const json = JSON.parse(data)

        if (json.errcode) {
          // AppSecret 未配置时返回模拟 openid（仅开发调试用）
          if (APP_SECRET === 'YOUR_APP_SECRET') {
            const mockOpenid = 'mock_openid_' + Date.now()
            return res.json({
              openid: mockOpenid,
              token: 'mock_token_' + mockOpenid,
              userInfo: { openid: mockOpenid, nickName: '测试用户' }
            })
          }
          return res.status(400).json({ message: json.errmsg || '登录失败' })
        }

        const { openid, session_key } = json
        // 生成简单 token（生产环境建议用 JWT）
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
        res.status(500).json({ message: '解析微信响应失败' })
      }
    })
  }).on('error', () => {
    res.status(500).json({ message: '网络请求失败' })
  })
})

module.exports = router
