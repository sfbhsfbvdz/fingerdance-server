// pages/login/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    // 降级方案（getUserProfile 失败时）
    fallback: false,
    avatarUrl: '',
    nickName: '',
  },

  /**
   * 一键登录：调用微信官方授权弹窗，自动获取头像+昵称
   * 微信会弹出 "xxx 申请获取你的昵称、头像" 原生弹窗
   */
  onWxLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })

    wx.getUserProfile({
      desc: '用于完善你的个人资料，参与拼团活动',
      success: (res) => {
        const { nickName, avatarUrl } = res.userInfo
        this._saveAndGo({ nickName, avatarUrl })
      },
      fail: () => {
        // 微信新版本已废弃 getUserProfile，降级为手动选头像+昵称
        this.setData({ loading: false, fallback: true })
      }
    })
  },

  // 降级方案：手动选头像
  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  // 降级方案：手动输入昵称
  onNickNameBlur(e) {
    const val = e.detail.value.trim()
    if (val) this.setData({ nickName: val })
  },

  // 降级方案：确认
  onConfirm() {
    const { nickName, avatarUrl } = this.data
    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    this._saveAndGo({ nickName, avatarUrl })
  },

  _saveAndGo({ nickName, avatarUrl }) {
    const userInfo = { nickName, avatarUrl }
    wx.setStorageSync('userInfo', userInfo)
    app.globalData.userInfo = userInfo
    this.setData({ loading: false })

    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  onSkip() {
    wx.setStorageSync('loginShown', true)
    wx.switchTab({ url: '/pages/index/index' })
  }
})
