// pages/index/index.js
const { request } = require('../../utils/request')

const MOCK_ACTIVITIES = [
  {
    id: 1, title: '春日光疗美甲套餐', groupPrice: 99, originalPrice: 198,
    currentParticipants: 28, minParticipants: 30, status: 'active',
    tags: ['拼团价', '限时'], endTime: '04-05',
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80'
  },
  {
    id: 2, title: '深层补水护肤体验', groupPrice: 128, originalPrice: 268,
    currentParticipants: 15, minParticipants: 20, status: 'active',
    tags: ['新客专享'], endTime: '04-03',
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80'
  },
  {
    id: 3, title: '精致手足护理套餐', groupPrice: 78, originalPrice: 158,
    currentParticipants: 42, minParticipants: 40, status: 'active',
    tags: ['团长推荐', '超值'], endTime: '04-10',
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80'
  },
  {
    id: 4, title: '眉眼全套造型设计', groupPrice: 158, originalPrice: 328,
    currentParticipants: 8, minParticipants: 15, status: 'active',
    tags: ['新品'], endTime: '04-08',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80'
  }
]

const JOIN_NAMES = ['王**', '李**', '张**', '陈**', '刘**', '赵**', '林**', '吴**']

Page({
  data: {
    storeName: '',
    storeSlogan: '',
    memberCount: 0,
    followCount: 0,
    isFollowed: false,
    // 最近参团通知
    latestJoin: null,
    // 公告滚动文本
    noticeText: '春季美甲新款上架 | 手工甲片限时5折 | 护肤套餐买一送一',
    // 活动列表
    hotActivities: [],
    loading: true
  },

  onLoad() {
    const app = getApp()
    // 只传渲染需要的字段，不把整个 globalData 塞进 data
    this.setData({
      storeName: app.globalData.storeName,
      storeSlogan: app.globalData.storeSlogan,
      memberCount: app.globalData.memberCount,
      followCount: 912,
      isFollowed: wx.getStorageSync('isFollowed') || false
    })
    this.fetchActivities()
  },

  onShow() {
    // 每次展示页面时刷新参团人数
    if (this.data.hotActivities.length > 0) {
      this.refreshJoinNotice()
    }
  },

  onUnload() {
    // 清理定时器
    if (this.noticeTimer) clearInterval(this.noticeTimer)
  },

  async fetchActivities() {
    try {
      const res = await request({ url: '/api/activities?status=active' })
      const list = Array.isArray(res) ? res : (res.data || [])
      this.setData({ hotActivities: list.slice(0, 4), loading: false })
      this.refreshJoinNotice()
    } catch (err) {
      // 网络失败时用本地模拟数据降级展示
      this.setData({ hotActivities: MOCK_ACTIVITIES, loading: false })
      this.refreshJoinNotice()
    }
  },

  refreshJoinNotice() {
    const { hotActivities } = this.data
    if (!hotActivities.length) return
    const name = JOIN_NAMES[Math.floor(Math.random() * JOIN_NAMES.length)]
    const activity = hotActivities[Math.floor(Math.random() * hotActivities.length)]
    const minutesAgo = Math.floor(Math.random() * 59) + 1
    this.setData({ latestJoin: { name, activityTitle: activity.title, minutesAgo } })

    // 每 8 秒随机切换一条通知
    if (this.noticeTimer) clearInterval(this.noticeTimer)
    this.noticeTimer = setInterval(() => {
      const n = JOIN_NAMES[Math.floor(Math.random() * JOIN_NAMES.length)]
      const a = hotActivities[Math.floor(Math.random() * hotActivities.length)]
      const m = Math.floor(Math.random() * 59) + 1
      this.setData({ latestJoin: { name: n, activityTitle: a.title, minutesAgo: m } })
    }, 8000)
  },

  onPullDownRefresh() {
    this.fetchActivities().finally(() => wx.stopPullDownRefresh())
  },

  onFollowTap() {
    const next = !this.data.isFollowed
    this.setData({ isFollowed: next })
    wx.setStorageSync('isFollowed', next)
    wx.showToast({ title: next ? '已订阅，活动抢先知' : '已取消订阅', icon: 'none' })
  },

  onServiceTap() {
    wx.showModal({
      title: '联系客服',
      content: '客服微信：fingerdance2024\n服务时间：10:00–21:00',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  onActivityTap(e) {
    const { id } = e.detail
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` })
  },

  onViewAll() {
    wx.switchTab({ url: '/pages/activity/index' })
  },

  onShareAppMessage() {
    return {
      title: '指尖芭蕾美甲美容 | 春日活动拼团进行中',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '指尖芭蕾美甲美容 | 春日拼团活动火热进行中 🌸'
    }
  }
})
