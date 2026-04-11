// pages/login/index.js
const app = getApp()

Page({
  data: {
    agreed: false,
    avatarUrl: '',
    nickName: '',
    step: 1,  // 1=授权弹窗 2=设置头像昵称
  },

  onAgree() {
    this.setData({ agreed: true })
  },

  // 微信官方：选择头像
  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl, step: 2 })
  },

  // 微信官方：昵称输入
  onNickNameBlur(e) {
    const val = e.detail.value.trim()
    if (val) this.setData({ nickName: val })
  },

  // 完成登录
  onConfirm() {
    const { nickName, avatarUrl } = this.data
    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    const userInfo = { nickName, avatarUrl }
    wx.setStorageSync('userInfo', userInfo)
    app.globalData.userInfo = userInfo

    // 返回来源页或首页
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  // 跳过（不设置头像昵称，仅用openid）
  onSkip() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
