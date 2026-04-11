// pages/order/index.js
const { request } = require('../../utils/request')

const STATUS_MAP = {
  unpaid: { label: '待支付', color: '#fa8c16' },
  pending: { label: '待成团', color: '#C9956C' },
  success: { label: '已成团', color: '#52c41a' },
  used: { label: '已使用', color: '#B8A8A8' },
  cancelled: { label: '已取消', color: '#B8A8A8' }
}

const MOCK_ORDERS = [
  { id: 1, activityTitle: '春日光疗美甲套餐', activityImage: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&q=80', groupPrice: 99, status: 'success', createdAt: '2026-03-28' },
  { id: 2, activityTitle: '深层补水护肤体验', activityImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&q=80', groupPrice: 128, status: 'pending', createdAt: '2026-03-30' }
]

Page({
  data: {
    orders: [],
    loading: true,
    statusMap: STATUS_MAP
  },

  onLoad() {
    this.fetchOrders()
  },

  onShow() {
    // 每次显示刷新订单状态
    this.fetchOrders()
  },

  async fetchOrders() {
    // openid 由 app.js 静默登录写入 Storage，直接读取
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      this.setData({ orders: MOCK_ORDERS, loading: false })
      return
    }
    try {
      const res = await request({ url: `/api/orders?userId=${openid}` })
      this.setData({ orders: res.data || res, loading: false })
    } catch (err) {
      this.setData({ orders: MOCK_ORDERS, loading: false })
    }
  },

  onOrderTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` })
  },

  onPullDownRefresh() {
    this.fetchOrders().finally(() => wx.stopPullDownRefresh())
  },

  onGoActivity() {
    wx.switchTab({ url: '/pages/activity/index' })
  },

  onShareAppMessage() {
    return { title: '指尖芭蕾美甲美容我的订单', path: '/pages/order/index' }
  }
})
