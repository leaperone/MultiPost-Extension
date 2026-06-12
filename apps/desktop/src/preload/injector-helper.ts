import { webFrame } from 'electron'
import contentHelperBundle from 'virtual:injector-content-helper'

// 仅哔哩哔哩动态发布页需要这套 MAIN-world helper(劫持 document.createElement 收集
// B 站游离的 file input + 监听 BILIBILI_DYNAMIC_UPLOAD_IMAGES 完成图片上传)。
// 其它依赖同一 helper 的平台(Bluesky/小黑盒/V2EX)各自验证后再逐一加入,避免一次性
// 把范围扩大到未实测的平台。
const CONTENT_HELPER_HOSTS = new Set(['t.bilibili.com'])

// 用 webFrame.executeJavaScript 而非注入 <script> 标签:
// 1) 它在页面 MAIN world 执行,但不被当作页面 inline 脚本,因此不受 script-src CSP 拦截;
// 2) 不依赖 document.documentElement/head 是否已创建,从根本上消除 document_start 时
//    DOM 根节点缺失导致 helper 永久静默 no-op 的风险。
// host 用 hostname(不含端口)并强制 https,避免在非预期 scheme 上注入。
if (location.protocol === 'https:' && CONTENT_HELPER_HOSTS.has(location.hostname)) {
  webFrame.executeJavaScript(contentHelperBundle).catch((error) => {
    console.error('[injector-helper] 注入 content helper 失败:', error)
  })
}
