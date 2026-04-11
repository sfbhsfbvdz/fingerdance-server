// utils/request.js - wx.request 统一封装
const app = getApp()

function request({ url, method = 'GET', data = {}, showLoading = false }) {
  if (showLoading) wx.showLoading({ title: '加载中', mask: true })

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.baseUrl}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
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
