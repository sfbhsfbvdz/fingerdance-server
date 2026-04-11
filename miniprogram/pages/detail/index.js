// pages/detail/index.js
const { request } = require('../../utils/request')

Page({
  data: {
    activity: null,
    loading: true,
    paying: false,
    progressPercent: 0,
    participants: [],
    hasJoined: false,
    joinedStatus: null  // 'unpaid' | 'pending' | 'success'
  },

  onLoad(options) {
    this.activityId = options.id
    // 捕获推客 ID（从分享链接带入）
    this.referrerId = options.referrer || null
    this.fetchDetail()
  },

  onUnload() {
    if (this.viewTimer) clearTimeout(this.viewTimer)
    if (this.pollTimer) clearTimeout(this.pollTimer)
  },

  async fetchDetail() {
    try {
      const res = await request({ url: `/api/activities/${this.activityId}` })
      const activity = res.data || res
      // 服务端返回 {user_id, user_name}，转成 WXML 期望的 {id, name}，最多显示 5 个头像
      const rawParticipants = activity.participants || []
      const allParticipants = rawParticipants.length
        ? rawParticipants.map(p => ({ id: p.user_id, name: p.user_name || '匿名' }))
        : this.getMockParticipants()
      const participants = allParticipants.slice(0, 5)
      this.setData({
        activity,
        loading: false,
        progressPercent: this.calcProgress(activity),
        participants
      })
      this.viewTimer = setTimeout(() => {
        request({ url: '/api/stats/pageview', method: 'POST', data: { activityId: this.activityId } }).catch(() => {})
      }, 1000)
      // 检查当前用户是否已参团
      this.checkJoinStatus()
    } catch (err) {
      const mock = this.getMockActivity()
      this.setData({
        activity: mock,
        loading: false,
        progressPercent: this.calcProgress(mock),
        participants: this.getMockParticipants()
      })
    }
  },

  async checkJoinStatus() {
    const openid = wx.getStorageSync('openid')
    if (!openid) return
    try {
      const res = await request({
        url: `/api/orders/check?activityId=${this.activityId}&userId=${openid}`
      })
      if (res.joined) {
        this.setData({ hasJoined: true, joinedStatus: res.status })
      }
    } catch {}
  },

  calcProgress(activity) {
    if (!activity || !activity.minParticipants) return 0
    return Math.min(Math.round((activity.currentParticipants / activity.minParticipants) * 100), 100)
  },

  getMockActivity() {
    const id = parseInt(this.activityId)
    const items = {
      1: { id: 1, title: '春日光疗美甲套餐', groupPrice: 99, originalPrice: 198, currentParticipants: 28, minParticipants: 30, status: 'active', tags: ['拼团价', '限时'], endTime: '2026-04-05', imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80', description: '🌸 春日新款光疗美甲，专业美甲师手工打造\n\n✨ 套餐内容：\n• 基础修型 + 打磨\n• 光疗甲 1 套（含款式选择）\n• 后续护理保养\n\n⏰ 有效期：30天内使用\n📍 地址：到店使用\n\n💕 需提前预约，拼团成功后联系客服排期' },
      2: { id: 2, title: '深层补水护肤体验', groupPrice: 128, originalPrice: 268, currentParticipants: 15, minParticipants: 20, status: 'active', tags: ['新客专享'], endTime: '2026-04-03', imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80', description: '💧 深层补水焕颜护肤套餐，适合干燥、暗沉肌肤\n\n✨ 套餐内容：\n• 深层清洁\n• 精华导入\n• 补水面膜\n• 后期锁水护理\n\n⏰ 时长约 90 分钟' }
    }
    return items[id] || items[1]
  },

  getMockParticipants() {
    return ['王**', '李**', '张**', '陈**', '刘**']
      .map((name, i) => ({ id: i, name, avatar: '' }))
  },

  // ── 支付入口 ──────────────────────────────────────────────
  async onPay() {
    const { activity, paying, hasJoined } = this.data
    if (paying || !activity || activity.status !== 'active' || hasJoined) return

    // 等待 app.js 静默登录完成，直接拿 openid，不重复登录
    const app = getApp()
    const openid = await app.waitLogin()
    if (!openid) {
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      return
    }

    this.setData({ paying: true })
    wx.showLoading({ title: '订单生成中', mask: true })

    try {
      // 1. 向服务端请求支付参数（含推客 referrerId）
      const payData = await request({
        url: '/api/payment/prepay',
        method: 'POST',
        data: {
          activityId: activity.id,
          openid,
          referrerId: this.referrerId || null
        }
      })

      wx.hideLoading()

      // 2. 调起微信支付面板
      wx.requestPayment({
        timeStamp: payData.timeStamp,
        nonceStr: payData.nonceStr,
        package: payData.packageStr,
        signType: payData.signType,
        paySign: payData.paySign,
        success: () => {
          // 支付成功：轮询订单状态（微信回调有延迟）
          this.pollOrderStatus(payData.orderId)
        },
        fail: (err) => {
          this.setData({ paying: false })
          if (err.errMsg !== 'requestPayment:fail cancel') {
            wx.showToast({ title: '支付失败，请重试', icon: 'none' })
          }
        }
      })
    } catch (err) {
      wx.hideLoading()
      this.setData({ paying: false })
      // 未配置商户号时给出提示
      if (err.message && err.message.includes('未配置')) {
        wx.showModal({ title: '支付未开通', content: '商户号配置中，敬请期待', showCancel: false })
      }
    }
  },

  // 轮询订单状态（最多查 10 次，每次间隔 1.5s）
  pollOrderStatus(orderId, tries = 0) {
    if (tries >= 10) {
      this.setData({ paying: false })
      wx.showToast({ title: '请在订单页查看结果', icon: 'none' })
      // 支付可能已完成但回调延迟，二次确认以正确禁用按钮
      this.checkJoinStatus()
      return
    }
    if (this.pollTimer) clearTimeout(this.pollTimer)
    this.pollTimer = setTimeout(async () => {
      try {
        const res = await request({ url: `/api/payment/status/${orderId}` })
        if (res.status === 'pending' || res.status === 'success') {
          this.setData({
            paying: false,
            hasJoined: true,
            joinedStatus: res.status,
            'activity.currentParticipants': this.data.activity.currentParticipants + 1,
            progressPercent: this.calcProgress({
              ...this.data.activity,
              currentParticipants: this.data.activity.currentParticipants + 1
            })
          })
          wx.showToast({ title: '参团成功！', icon: 'success' })
          setTimeout(() => wx.switchTab({ url: '/pages/order/index' }), 1500)
        } else if (res.status === 'unpaid') {
          this.pollOrderStatus(orderId, tries + 1)
        } else {
          this.setData({ paying: false })
        }
      } catch {
        this.pollOrderStatus(orderId, tries + 1)
      }
    }, 1500)
  },

  onViewOrder() {
    wx.switchTab({ url: '/pages/order/index' })
  },

  // 分享时把自己的 openid 作为 referrer 带入链接
  onShareAppMessage() {
    const { activity } = this.data
    const myOpenid = getApp().globalData.openid || ''
    return {
      title: activity
        ? `${activity.title} 仅需¥${activity.groupPrice}，快来拼团！`
        : '指尖芭蕾美甲美容拼团活动',
      path: `/pages/detail/index?id=${this.activityId}&referrer=${myOpenid}`
    }
  },

  // 分享到朋友圈（朋友圈不支持path参数，只能到首页）
  onShareTimeline() {
    const { activity } = this.data
    return {
      title: activity
        ? `${activity.title} 拼团价¥${activity.groupPrice}，快来参团！`
        : '指尖芭蕾美甲美容 | 拼团活动进行中',
      query: `id=${this.activityId}`
    }
  }
})
