/**
 * agentConfig.js — 服务商授权配置（预留位）
 *
 * 当前免费测试版默认全部关闭：不显示任何联系方式。
 * 以后接入服务商 / 代理商时：
 *   1. 把 enabled 置为 true
 *   2. 填写 agentName / contactWechat / contactQrCode
 *   3. 把 showContact 置为 true，页面底部即会显示服务商名称与联系方式
 *
 * 页面规则：showContact === false → 不显示任何联系方式（当前默认）
 */
export const agentConfig = {
  enabled: false,
  agentName: '',
  contactWechat: '',
  contactQrCode: '',
  showContact: false
}
