import { UpdateNotification } from './components/UpdateNotification'
import { BrowserTabs } from './components/BrowserTabs'

/**
 * Desktop App - 浏览器架构
 *
 * 主窗口 renderer 只负责渲染标签栏
 * 所有内容（包括首页）都在 BrowserView 中显示
 * 标签栏固定在顶部:
 * - 单层: 40px (首页或普通 tab)
 * - 两层: 76px (发布 Group 激活时，显示 Group 内部 tabs)
 */
function App(): React.ReactElement {
  return (
    <div className="h-screen bg-background">
      <BrowserTabs />

      {/* 更新通知 */}
      <UpdateNotification />
    </div>
  )
}

export default App
