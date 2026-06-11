import { useEffect } from 'react'
import { UpdateNotification } from './components/UpdateNotification'
import { BrowserTabs } from './components/BrowserTabs'
import { NativeShell } from './components/native/NativeShell'
import { useTabsStore } from './store/tabs.store'
import { useUiStore, type NativeView } from './store/ui.store'

const NATIVE_VIEWS = new Set<NativeView>([
  'home',
  'publish-dynamic',
  'publish-video',
  'publish-article',
  'publish-podcast',
  'accounts',
  'drafts',
  'history',
  'settings',
  'about'
])

function isNativeView(value: string): value is NativeView {
  return NATIVE_VIEWS.has(value as NativeView)
}

/**
 * Desktop App - 浏览器架构
 *
 * 主窗口 renderer 渲染顶部浏览器 chrome 和原生首页两部分：
 * - home tab 激活时主进程把本视图扩展为全窗口，chrome 下方显示 NativeShell
 * - 其他 tab 激活时本视图缩回 72px，内容由对应 BrowserView 接管
 */
function App(): React.ReactElement {
  useEffect(() => useTabsStore.getState().init(), [])
  useEffect(() => {
    return window.api.onUiNavigate(({ view }) => {
      if (isNativeView(view)) {
        useUiStore.getState().navigate(view)
      }
    })
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <BrowserTabs className="shrink-0" />

      <div className="min-h-0 flex-1">
        <NativeShell />
      </div>

      {/* 更新通知 */}
      <UpdateNotification />
    </div>
  )
}

export default App
