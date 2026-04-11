// pages/activity/index.js
const { request } = require('../../utils/request')

const STATUS_TABS = [
  { key: 'active', label: '进行中' },
  { key: 'pending', label: '即将开始' },
  { key: 'ended', label: '已结束' }
]

const MOCK = {
  active: [
    { id: 1, title: '春日光疗美甲套餐', groupPrice: 99, originalPrice: 198, currentParticipants: 28, minParticipants: 30, status: 'active', tags: ['拼团价', '限时'], endTime: '04-05', imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80' },
    { id: 2, title: '深层补水护肤体验', groupPrice: 128, originalPrice: 268, currentParticipants: 15, minParticipants: 20, status: 'active', tags: ['新客专享'], endTime: '04-03', imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80' },
    { id: 3, title: '精致手足护理套餐', groupPrice: 78, originalPrice: 158, currentParticipants: 42, minParticipants: 40, status: 'active', tags: ['团长推荐', '超值'], endTime: '04-10', imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80' },
    { id: 4, title: '眉眼全套造型设计', groupPrice: 158, originalPrice: 328, currentParticipants: 8, minParticipants: 15, status: 'active', tags: ['新品'], endTime: '04-08', imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80' }
  ],
  pending: [
    { id: 5, title: '夏日防晒美白套餐', groupPrice: 168, originalPrice: 358, currentParticipants: 0, minParticipants: 20, status: 'pending', tags: ['预售'], endTime: '04-15', imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80' }
  ],
  ended: [
    { id: 6, title: '冬日滋润护手套餐', groupPrice: 58, originalPrice: 128, currentParticipants: 56, minParticipants: 40, status: 'ended', tags: ['已结束'], endTime: '03-20', imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80' }
  ]
}

Page({
  data: {
    tabs: STATUS_TABS,
    activeTab: 0,
    list: [],
    loading: true,
    hasMore: false
  },

  onLoad() {
    this.fetchList()
  },

  onShow() {
    // 从详情页返回时刷新进行中的人数
    if (this.data.activeTab === 0) this.fetchList()
  },

  onUnload() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
  },

  async fetchList() {
    const status = STATUS_TABS[this.data.activeTab].key
    this.setData({ loading: true })
    try {
      const res = await request({ url: `/api/activities?status=${status}` })
      const list = Array.isArray(res) ? res : (res.data || [])
      this.setData({ list, loading: false, hasMore: false })
    } catch (err) {
      this.setData({ list: MOCK[status] || [], loading: false })
    }
  },

  onTabChange(e) {
    const { index } = e.currentTarget.dataset
    if (index === this.data.activeTab) return
    this.setData({ activeTab: index, list: [] })
    this.fetchList()
  },

  onActivityTap(e) {
    const { id } = e.detail
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` })
  },

  onPullDownRefresh() {
    this.fetchList().then(() => wx.stopPullDownRefresh())
  },

  onShareAppMessage() {
    return {
      title: '指尖芭蕾美甲美容 | 团购活动合集',
      path: '/pages/activity/index'
    }
  }
})
