// utils/request.js - 使用微信云托管 callContainer，无需配置合法域名
const ENV_ID = 'prod-3gfpsiqy6afca7e1'
const SERVICE = 'express-0a2x'

function request({ url, method = 'GET', data = {}, showLoading = false }) {
  if (showLoading) wx.showLoading({ title: '加载中', mask: true })

  return new Promise((resolve, reject) => {
    wx.cloud.callContainer({
      config: { env: ENV_ID },
      path: url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`,
        'X-WX-SERVICE': SERVICE
      },
      success(res) {
        if (showLoading) wx.hideLoading()
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          wx.showToast({ title: res.data?.message || '请求失败', icon: 'none' })
          reject(new Error(res.data?.message || '请求失败'))
        }
      },
      fail(err) {
        if (showLoading) wx.hideLoading()
        wx.showToast({ title: '网络异常，请重试', icon: 'none' })
        reject(err)
      }
    })
  })
}

module.exports = { request }
