// pages/login/index.js
const app = getApp()
const { request } = require('../../utils/request')

Page({
  data: {
    loading: false,
    agreed: false,      // 隐私政策勾选状态（默认未勾选）
    fallback: false,
    avatarUrl: '',
    nickName: '',
  },

  // 用户主动勾选/取消勾选隐私协议
  onAgreeChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 })
  },

  // 点击查看隐私政策
  onViewPrivacy() {
    wx.openPrivacyContract({ fail: () => {} })
  },

  // 一键登录：必须先勾选隐私协议
  onWxLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意隐私政策', icon: 'none' })
      return
    }
    if (this.data.loading) return
    this.setData({ loading: true })

    wx.getUserProfile({
      desc: '用于完善你的个人资料，参与拼团活动',
      success: (res) => {
        const { nickName, avatarUrl } = res.userInfo
        this._saveAndGo({ nickName, avatarUrl })
      },
      fail: () => {
        this.setData({ loading: false, fallback: true })
      }
    })
  },

  // 降级：选头像
  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  // 降级：输入昵称
  onNickNameBlur(e) {
    const val = e.detail.value.trim()
    if (val) this.setData({ nickName: val })
  },

  // 降级：确认
  onConfirm() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意隐私政策', icon: 'none' })
      return
    }
    const { nickName, avatarUrl } = this.data
    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    this._saveAndGo({ nickName, avatarUrl })
  },

  async _saveAndGo({ nickName, avatarUrl }) {
    // 内容安全检测
    try {
      const openid = app.globalData.openid || wx.getStorageSync('openid')
      if (openid && nickName) {
        const result = await request({
          url: '/api/security/check-text',
          method: 'POST',
          data: { content: nickName, openid }
        })
        if (!result.safe) {
          this.setData({ loading: false })
          wx.showModal({
            title: '昵称不合规',
            content: result.message || '昵称含有违规信息，请修改后重试',
            showCancel: false,
            confirmText: '知道了'
          })
          return
        }
      }
    } catch (e) {
      // 检测失败不阻断登录
    }

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
