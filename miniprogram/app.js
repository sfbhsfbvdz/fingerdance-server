// app.js
App({
  globalData: {
    openid: '',
    token: '',
    userInfo: null,       // { nickName, avatarUrl } 用户主动设置的信息
    baseUrl: 'https://express-0a2x-245301-5-1420709895.sh.run.tcloudbase.com',
    storeName: '指尖芭蕾美甲美容',
    storeSlogan: '让美丽在指尖绽放',
    memberCount: 3826,
    loginReady: false,    // 静默登录是否完成
    loginCallbacks: [],   // 等待登录完成的回调队列
  },

  onLaunch() {
    // 1. 读取本地缓存的用户信息
    const cachedInfo = wx.getStorageSync('userInfo')
    if (cachedInfo) this.globalData.userInfo = cachedInfo

    // 2. 检查 token 是否仍有效，有效直接用，否则重新登录
    const token = wx.getStorageSync('token')
    const openid = wx.getStorageSync('openid')
    const tokenExpire = wx.getStorageSync('tokenExpire')

    if (token && openid && tokenExpire && Date.now() < tokenExpire) {
      this.globalData.token = token
      this.globalData.openid = openid
      this._onLoginReady()
    } else {
      // token 不存在或已过期，重新静默登录
      this.silentLogin()
    }

    // 3. 小程序更新检测
    this._checkUpdate()
  },

  /**
   * 静默登录：用户无感知，仅获取 openid
   * 不弹任何授权框
   */
  silentLogin() {
    wx.login({
      success: (res) => {
        if (!res.code) return
        wx.request({
          url: `${this.globalData.baseUrl}/api/auth/login`,
          method: 'POST',
          data: { code: res.code },
          success: (r) => {
            if (r.statusCode === 200 && r.data.openid) {
              const { openid, token } = r.data
              // token 有效期 7 天
              const expire = Date.now() + 7 * 24 * 3600 * 1000
              wx.setStorageSync('openid', openid)
              wx.setStorageSync('token', token)
              wx.setStorageSync('tokenExpire', expire)
              this.globalData.openid = openid
              this.globalData.token = token
            }
            this._onLoginReady()
          },
          fail: () => this._onLoginReady()
        })
      },
      fail: () => this._onLoginReady()
    })
  },

  /**
   * 供其他页面调用：等待登录完成再执行回调
   * 用法：app.waitLogin().then(openid => { ... })
   */
  waitLogin() {
    return new Promise((resolve) => {
      if (this.globalData.loginReady) {
        resolve(this.globalData.openid)
      } else {
        this.globalData.loginCallbacks.push(resolve)
      }
    })
  },

  _onLoginReady() {
    this.globalData.loginReady = true
    // 依次执行等待队列里的回调
    this.globalData.loginCallbacks.forEach(cb => cb(this.globalData.openid))
    this.globalData.loginCallbacks = []
    // 记录本次访问
    this._recordPageView()
  },

  _recordPageView() {
    wx.request({
      url: `${this.globalData.baseUrl}/api/stats/pageview`,
      method: 'POST',
      data: { timestamp: Date.now() },
      fail() {}
    })
  },

  _checkUpdate() {
    if (!wx.canIUse('getUpdateManager')) return
    const mgr = wx.getUpdateManager()
    mgr.onCheckForUpdate(res => {
      if (!res.hasUpdate) return
      mgr.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启？',
          success(r) {
            if (r.confirm) mgr.applyUpdate()
          }
        })
      })
    })
  }
})
