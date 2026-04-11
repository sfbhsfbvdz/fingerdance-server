// pages/profile/index.js
const app = getApp()

Page({
  data: {
    // 用户信息
    nickName: '',
    avatarUrl: '',
    openid: '',
    isLoggedIn: false,
    // 编辑状态
    editing: false,
    tempNickName: '',
    tempAvatarUrl: '',
  },

  onShow() {
    // 每次显示时从 globalData / Storage 同步最新信息，并重置编辑状态
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    const openid = app.globalData.openid || wx.getStorageSync('openid') || ''
    this.setData({
      nickName: userInfo.nickName || '',
      avatarUrl: userInfo.avatarUrl || '',
      openid,
      isLoggedIn: !!openid,
      editing: false,
      tempNickName: userInfo.nickName || '',
      tempAvatarUrl: userInfo.avatarUrl || '',
    })
  },

  // ── 微信官方：选择头像（open-type="chooseAvatar"）──
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({ tempAvatarUrl: avatarUrl, editing: true })
  },

  // ── 微信官方：昵称输入框失焦时读取（type="nickname"）──
  onNickNameBlur(e) {
    const val = e.detail.value.trim()
    if (val) this.setData({ tempNickName: val, editing: true })
  },

  // ── 保存个人信息 ──
  onSave() {
    const { tempNickName, tempAvatarUrl } = this.data
    if (!tempNickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    const userInfo = { nickName: tempNickName, avatarUrl: tempAvatarUrl }
    wx.setStorageSync('userInfo', userInfo)
    app.globalData.userInfo = userInfo
    this.setData({ nickName: tempNickName, avatarUrl: tempAvatarUrl, editing: false })
    wx.showToast({ title: '保存成功 🌸', icon: 'none' })
  },

  // ── 跳转订单 ──
  onGoOrders() {
    wx.switchTab({ url: '/pages/order/index' })
  },

  // ── 联系客服 ──
  onService() {
    wx.showModal({
      title: '联系客服',
      content: '客服微信：fingerdance2024\n服务时间：10:00–21:00',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  onAbout() {
    wx.showModal({
      title: '关于指尖芭蕾',
      content: '指尖芭蕾美甲美容，专注于美甲、护肤、美容服务。\n\n我们相信美丽是一种态度，让指尖绽放你的精彩。',
      showCancel: false
    })
  }
})
