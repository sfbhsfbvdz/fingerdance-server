// server/utils/wxpay.js
// 微信支付工具类 - 填入商户信息后即可使用
// 申请地址：https://pay.weixin.qq.com

const crypto = require('crypto')
const fetch = require('node-fetch')

// ============================================================
// 👇 填入你的商户信息
// ============================================================
const WX_PAY_CONFIG = {
  appId: process.env.WX_APP_ID,
  mchId: process.env.WX_MCH_ID,
  apiKey: process.env.WX_API_KEY,
  notifyUrl: process.env.WX_NOTIFY_URL,
}
// ============================================================

/**
 * 生成随机字符串
 */
function nonceStr(len = 32) {
  return crypto.randomBytes(len).toString('hex').slice(0, len)
}

/**
 * MD5 签名（微信支付 v2 签名）
 */
function sign(params) {
  const str = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== undefined && k !== 'sign')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&') + `&key=${WX_PAY_CONFIG.apiKey}`

  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase()
}

/**
 * 对象转 XML
 */
function toXml(obj) {
  return '<xml>' +
    Object.entries(obj).map(([k, v]) => `<${k}><![CDATA[${v}]]></${k}>`).join('') +
    '</xml>'
}

/**
 * XML 转对象（简单解析）
 */
function fromXml(xml) {
  const result = {}
  const re = /<(\w+)><!\[CDATA\[([\s\S]*?)\]\]><\/\1>|<(\w+)>([\s\S]*?)<\/\3>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    result[m[1] || m[3]] = m[2] !== undefined ? m[2] : m[4]
  }
  return result
}

/**
 * 统一下单 - 向微信支付服务器发起请求，获取 prepay_id
 * @param {Object} options
 * @param {string} options.outTradeNo  - 商户订单号（唯一）
 * @param {number} options.totalFee    - 金额（分）
 * @param {string} options.body        - 商品描述
 * @param {string} options.openid      - 用户 openid
 * @returns {Promise<{prepayId, timeStamp, nonceStr, packageStr, signType, paySign}>}
 */
async function unifiedOrder({ outTradeNo, totalFee, body, openid }) {
  // 检查配置
  if (WX_PAY_CONFIG.apiKey === 'YOUR_API_KEY_32CHARS') {
    throw new Error('微信支付未配置，请在 server/utils/wxpay.js 填入商户信息')
  }

  const params = {
    appid: WX_PAY_CONFIG.appId,
    mch_id: WX_PAY_CONFIG.mchId,
    nonce_str: nonceStr(),
    body,
    out_trade_no: outTradeNo,
    total_fee: totalFee,           // 单位：分
    spbill_create_ip: '127.0.0.1',
    notify_url: WX_PAY_CONFIG.notifyUrl,
    trade_type: 'JSAPI',
    openid,
  }
  params.sign = sign(params)

  // 调用微信统一下单接口
  const xml = toXml(params)
  console.log('[wxpay] config check - appId:', WX_PAY_CONFIG.appId, 'mchId:', WX_PAY_CONFIG.mchId, 'hasKey:', !!WX_PAY_CONFIG.apiKey)
  let respXml
  try {
    const resp = await fetch('http://api.mch.weixin.qq.com/pay/unifiedorder', {
      method: 'POST',
      body: xml,
      headers: { 'Content-Type': 'text/xml' }
    })
    respXml = await resp.text()
    console.log('[wxpay] raw response:', respXml.substring(0, 300))
  } catch (fetchErr) {
    console.error('[wxpay] fetch error:', fetchErr.message)
    throw new Error('连接微信支付失败: ' + fetchErr.message)
  }
  const result = fromXml(respXml)

  if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
    console.error('[wxpay] unifiedOrder failed:', JSON.stringify(result))
    throw new Error(result.err_code_des || result.err_code || result.return_msg || '统一下单失败')
  }

  // 生成小程序端调起支付所需的签名参数
  const ts = String(Math.floor(Date.now() / 1000))
  const ns = nonceStr()
  const pkg = `prepay_id=${result.prepay_id}`
  const payParams = {
    appId: WX_PAY_CONFIG.appId,
    timeStamp: ts,
    nonceStr: ns,
    package: pkg,
    signType: 'MD5',
  }
  payParams.paySign = sign(payParams)

  return {
    prepayId: result.prepay_id,
    timeStamp: ts,
    nonceStr: ns,
    packageStr: pkg,
    signType: 'MD5',
    paySign: payParams.paySign,
  }
}

/**
 * 验证微信回调签名
 */
function verifyNotify(params) {
  const received = params.sign
  const computed = sign(params)
  return received === computed
}

module.exports = { unifiedOrder, verifyNotify, fromXml, WX_PAY_CONFIG }
