// utils/request.js
// 优先用 callContainer（云托管内网，无需域名白名单）
// wx.cloud 不可用时降级为 wx.request（开发者工具模拟器）
const ENV_ID = 'prod-3gfpsiqy6afca7e1'
const SERVICE = 'express-0a2x'

function request({ url, method = 'GET', data = {}, showLoading = false }) {
  if (showLoading) wx.showLoading({ title: '加载中', mask: true })

  return new Promise((resolve, reject) => {
    const onSuccess = (res) => {
      if (showLoading) wx.hideLoading()
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(res.data)
      } else {
        wx.showToast({ title: res.data?.message || '请求失败', icon: 'none' })
        reject(new Error(res.data?.message || '请求失败'))
      }
    }
    const onFail = (err) => {
      if (showLoading) wx.hideLoading()
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
      reject(err)
    }

    if (wx.cloud && wx.cloud.callContainer) {
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
        success: onSuccess,
        fail: onFail
      })
    } else {
      const app = getApp()
      wx.request({
        url: `${app.globalData.baseUrl}${url}`,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        },
        success: onSuccess,
        fail: onFail
      })
    }
  })
}

module.exports = { request }
