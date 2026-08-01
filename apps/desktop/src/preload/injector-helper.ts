import { webFrame } from 'electron'
import contentHelperBundle from 'virtual:injector-content-helper'

const CONTENT_HELPER_ROUTES: Record<string, (pathname: string) => boolean> = {
  't.bilibili.com': () => true,
  'bsky.app': () => true,
  'www.v2ex.com': (pathname) => pathname.startsWith('/write'),
  'v2ex.com': (pathname) => pathname.startsWith('/write'),
  'www.xiaoheihe.cn': (pathname) => pathname.startsWith('/creator/editor/'),
  'weibo.com': (pathname) => pathname.startsWith('/upload/channel')
}

// 用 webFrame.executeJavaScript 而非注入 <script> 标签:
// 1) 它在页面 MAIN world 执行,但不被当作页面 inline 脚本,因此不受 script-src CSP 拦截;
// 2) 不依赖 document.documentElement/head 是否已创建,从根本上消除 document_start 时
//    DOM 根节点缺失导致 helper 永久静默 no-op 的风险。
// host 用 hostname(不含端口)并强制 https,避免在非预期 scheme 上注入。
const routeMatcher = CONTENT_HELPER_ROUTES[location.hostname]

if (location.protocol === 'https:' && routeMatcher?.(location.pathname)) {
  webFrame.executeJavaScript(contentHelperBundle).catch((error) => {
    console.error('[injector-helper] 注入 content helper 失败:', error)
  })
}
