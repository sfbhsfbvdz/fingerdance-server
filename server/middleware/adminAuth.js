// server/middleware/adminAuth.js
// 验证管理后台请求是否携带有效 token
const { tokens } = require('../routes/admin')

module.exports = function adminAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim()
  const expireAt = tokens.get(token)
  if (!token || !expireAt || Date.now() > expireAt) {
    return res.status(401).json({ message: '请先登录管理后台' })
  }
  next()
}
