// server/routes/activities.js
const express = require('express')
const router = express.Router()
const db = require('../db')
const adminAuth = require('../middleware/adminAuth')

// GET /api/activities?status=active
router.get('/', (req, res) => {
  const { status } = req.query
  let stmt
  if (status && status !== 'all') {
    stmt = db.prepare('SELECT * FROM activities WHERE status = ? ORDER BY created_at DESC')
    const rows = stmt.all(status)
    return res.json(rows.map(parseActivity))
  }
  stmt = db.prepare('SELECT * FROM activities ORDER BY created_at DESC')
  res.json(stmt.all().map(parseActivity))
})

// GET /api/activities/:id
router.get('/:id', (req, res) => {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id)
  if (!activity) return res.status(404).json({ message: '活动不存在' })

  const participants = db.prepare(
    "SELECT user_id, user_name FROM orders WHERE activity_id = ? AND status NOT IN ('unpaid', 'cancelled') ORDER BY created_at DESC LIMIT 20"
  ).all(activity.id)

  res.json({ ...parseActivity(activity), participants })
})

// POST /api/activities（管理后台用）
router.post('/', adminAuth, (req, res) => {
  const { title, description, imageUrl, originalPrice, groupPrice, minParticipants, status, tags, endTime } = req.body
  if (!title || !originalPrice || !groupPrice) {
    return res.status(400).json({ message: '标题和价格为必填项' })
  }
  const result = db.prepare(`
    INSERT INTO activities (title, description, image_url, original_price, group_price, min_participants, status, tags, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', imageUrl || '', originalPrice, groupPrice, minParticipants || 10, status || 'pending', JSON.stringify(tags || []), endTime || '')

  const created = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(parseActivity(created))
})

// PUT /api/activities/:id（管理后台用）
router.put('/:id', adminAuth, (req, res) => {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id)
  if (!activity) return res.status(404).json({ message: '活动不存在' })

  const { title, description, imageUrl, originalPrice, groupPrice, minParticipants, status, tags, endTime } = req.body
  db.prepare(`
    UPDATE activities SET
      title = ?, description = ?, image_url = ?, original_price = ?,
      group_price = ?, min_participants = ?, status = ?, tags = ?, end_time = ?
    WHERE id = ?
  `).run(
    title ?? activity.title,
    description ?? activity.description,
    imageUrl ?? activity.image_url,
    originalPrice ?? activity.original_price,
    groupPrice ?? activity.group_price,
    minParticipants ?? activity.min_participants,
    status ?? activity.status,
    tags !== undefined ? JSON.stringify(tags || []) : activity.tags,
    endTime ?? activity.end_time,
    req.params.id
  )

  res.json(parseActivity(db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id)))
})

// DELETE /api/activities/:id（管理后台用）
router.delete('/:id', adminAuth, (req, res) => {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id)
  if (!activity) return res.status(404).json({ message: '活动不存在' })
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

function parseActivity(row) {
  return {
    ...row,
    imageUrl: row.image_url,
    originalPrice: row.original_price,
    groupPrice: row.group_price,
    minParticipants: row.min_participants,
    currentParticipants: row.current_participants,
    endTime: row.end_time,
    tags: (() => { try { return JSON.parse(row.tags) } catch { return [] } })()
  }
}

module.exports = router
