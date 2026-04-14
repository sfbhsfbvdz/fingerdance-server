// server/routes/security.js
// 微信内容安全检测：昵称等用户输入内容在保存前必须经过检测
const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const https = require('https')

const APP_ID = process.env.WX_APP_ID
const APP_SECRET = process.env.WX_APP_SECRET

const wxAgent = new https.Agent({ rejectUnauthorized: false })

// 缓存 access_token（有效期 2 小时）
let tokenCache = { token: '', expireAt: 0 }

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expireAt) {
    return tokenCache.token
  }
  const url = `http://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.access_token) {
    tokenCache = {
      token: json.access_token,
      expireAt: Date.now() + (json.expires_in - 300) * 1000  // 提前 5 分钟过期
    }
    return json.access_token
  }
  throw new Error('获取 access_token 失败: ' + (json.errmsg || JSON.stringify(json)))
}

/**
 * POST /api/security/check-text
 * body: { content, openid }
 * 返回: { safe: true } 或 { safe: false, message: '内容含违规信息' }
 */
router.post('/check-text', async (req, res) => {
  const { content, openid } = req.body
  if (!content || !openid) {
    return res.status(400).json({ message: '缺少参数' })
  }

  try {
    const token = await getAccessToken()
    const checkRes = await fetch(
      `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, version: 2, scene: 2, openid }),
        agent: wxAgent
      }
    )
    const result = await checkRes.json()
    console.log('[security] check result:', JSON.stringify(result))

    if (result.errcode !== 0) {
      // errcode=40001 token失效，清除缓存
      if (result.errcode === 40001) tokenCache = { token: '', expireAt: 0 }
      // 接口异常时放行，避免影响正常用户
      return res.json({ safe: true })
    }

    const suggest = result.result && result.result.suggest
    if (suggest === 'risky') {
      return res.json({ safe: false, message: '昵称含有违规信息，请修改后重试' })
    }
    // suggest = 'pass' 或 'review' 均放行
    res.json({ safe: true })
  } catch (e) {
    console.error('[security] error:', e.message)
    // 检测异常时放行
    res.json({ safe: true })
  }
})

module.exports = router
