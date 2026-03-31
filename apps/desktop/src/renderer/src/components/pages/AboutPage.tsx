import { Globe, Github, ExternalLink, Heart, Zap, Shield, Users } from 'lucide-react'
import { Button } from '@heroui/react'

const APP_VERSION = '0.1.0'

const features = [
  {
    icon: Zap,
    title: '一键多平台发布',
    description: '支持微博、小红书、抖音、B站等 50+ 主流平台，一次编辑，多平台同步发布'
  },
  {
    icon: Shield,
    title: '安全可靠',
    description: '本地运行，数据安全有保障，不上传任何敏感信息到云端'
  },
  {
    icon: Users,
    title: '多账号管理',
    description: '支持同一平台多账号管理，轻松切换不同账号发布内容'
  }
]

const links = [
  {
    label: 'GitHub 仓库',
    url: 'https://github.com/leaper-one/multipost-desktop',
    icon: Github
  },
  {
    label: '官方网站',
    url: 'https://multipost.app',
    icon: Globe
  },
  {
    label: '浏览器扩展',
    url: 'https://chromewebstore.google.com/detail/multipost',
    icon: ExternalLink
  }
]

export function AboutPage(): React.ReactElement {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-primary/10 mb-4">
          <Globe className="size-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">MultiPost</h1>
        <p className="text-muted-foreground text-lg">多平台内容发布工具</p>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm">
          <span>版本</span>
          <span className="font-mono font-medium">{APP_VERSION}</span>
        </div>
      </div>

      {/* Description */}
      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-foreground leading-relaxed">
          MultiPost 是一款专为内容创作者打造的桌面应用，帮助你高效管理和发布内容到多个社交媒体平台。
          无论你是自媒体博主、品牌运营还是内容营销人员，都能通过 MultiPost 显著提升工作效率。
        </p>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">核心功能</h2>
        <div className="grid gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 p-4 bg-card rounded-lg border border-border"
            >
              <div className="flex-shrink-0 size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <feature.icon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">相关链接</h2>
        <div className="flex flex-wrap gap-3">
          {links.map((link) => (
            <Button
              key={link.label}
              variant="bordered"
              onPress={() => window.open(link.url, '_blank')}
              startContent={<link.icon className="size-4" />}
            >
              {link.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
          Made with <Heart className="size-4 text-red-500 fill-red-500" /> by{' '}
          <a
            href="https://leaper.one"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Leaper One
          </a>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Copyright © 2024 MultiPost. All rights reserved.
        </p>
      </div>
    </div>
  )
}
