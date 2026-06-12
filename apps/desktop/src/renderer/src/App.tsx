import { useEffect } from 'react'
import { UpdateNotification } from './components/UpdateNotification'
import { BrowserTabs } from './components/BrowserTabs'
import { NativeShell } from './components/native/NativeShell'
import { useTabsStore, HOME_TAB_ID } from './store/tabs.store'
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

  // 主视图 renderer 同时承载顶部标签条和原生首页。非 home tab 激活时主进程把它
  // 收缩成 72px 顶栏,此时必须隐藏 NativeShell——否则它会在矮视口里继续渲染、
  // 内部侧栏(底部就是设置/关于)可滚动,被用户滚出来。用 hidden(display:none)
  // 隐藏:不可见、不占布局、不可滚动,同时保留组件状态。
  const tabs = useTabsStore((state) => state.tabs)
  const isHomeActive = (tabs.find((tab) => tab.isActive)?.id ?? HOME_TAB_ID) === HOME_TAB_ID

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <BrowserTabs className="shrink-0" />

      <div className={`min-h-0 flex-1 ${isHomeActive ? '' : 'hidden'}`}>
        <NativeShell />
      </div>

      {/* 更新通知 */}
      <UpdateNotification />
    </div>
  )
}

export default App
