import { Send, History, Zap, Shield, MessageSquare, Video, FileText, Radio } from 'lucide-react'
import type { ViewType } from '../AppSidebar'

interface HomePageProps {
  onNavigate: (view: ViewType) => void
}

export function HomePage({ onNavigate }: HomePageProps): React.ReactElement {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary text-primary-foreground mb-2">
          <Send className="size-8" />
        </div>
        <h1 className="text-3xl font-bold">欢迎使用 MultiPost</h1>
        <p className="text-muted-foreground text-lg">
          一键发布内容到多个社交媒体平台
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-4">
        <button
          onClick={() => onNavigate('publish-dynamic')}
          className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all text-left"
        >
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">发布动态</h3>
            <p className="text-sm text-muted-foreground">发布图文内容</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('publish-video')}
          className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all text-left"
        >
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Video className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">发布视频</h3>
            <p className="text-sm text-muted-foreground">发布视频内容</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('publish-article')}
          className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all text-left"
        >
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">发布文章</h3>
            <p className="text-sm text-muted-foreground">发布长文内容</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('publish-podcast')}
          className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all text-left"
        >
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Radio className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">发布播客</h3>
            <p className="text-sm text-muted-foreground">发布音频内容</p>
          </div>
        </button>
      </div>

      {/* History */}
      <div>
        <button
          onClick={() => onNavigate('history')}
          className="w-full flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all text-left"
        >
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">历史记录</h3>
            <p className="text-sm text-muted-foreground">查看发布历史</p>
          </div>
        </button>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">核心特性</h2>
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Zap className="size-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">一键多平台发布</h3>
              <p className="text-sm text-muted-foreground">
                支持微博、小红书、抖音、B站等 50+ 主流平台
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Shield className="size-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">安全可靠</h3>
              <p className="text-sm text-muted-foreground">
                本地运行，数据安全有保障
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>提示：使用 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘B</kbd> 切换侧边栏</p>
      </div>
    </div>
  )
}
