import { useEffect, useState } from 'react'
import { Globe, Github, ExternalLink, Heart } from 'lucide-react'
import { Button } from '../ui/button'
import logo from '../../assets/logo.png'

const links = [
  {
    label: 'GitHub Releases',
    url: 'https://github.com/leaperone/MultiPost-Desktop-Release/releases',
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
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    window.api.app
      .getVersion()
      .then(setAppVersion)
      .catch((error) => console.error('Failed to get app version:', error))
  }, [])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <img src={logo} alt="MultiPost" className="size-20 rounded-2xl" />
        <h1 className="text-xl font-semibold">MultiPost</h1>
        <p className="text-muted-foreground">多平台内容发布工具</p>
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
          <span>版本</span>
          <span className="font-mono font-medium">{appVersion ? `v${appVersion}` : '...'}</span>
        </div>
      </div>

      {/* Description */}
      <p className="mx-auto max-w-xl text-center text-sm leading-relaxed text-foreground">
        MultiPost 是一款把动态、视频、文章、播客一次发布到多个平台的桌面工具。
        它完全在你的电脑上本地运行，账号登录状态、草稿和发布历史都只保存在本机，不会上传到云端。
      </p>

      {/* Links */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">相关链接</h2>
        <div className="flex flex-wrap gap-3">
          {links.map((link) => (
            <Button
              key={link.label}
              variant="outline"
              onClick={() => window.open(link.url, '_blank')}
            >
              <link.icon />
              {link.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t pt-4 text-center">
        <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          Made with <Heart className="size-4" /> by{' '}
          <a
            href="https://leaper.one"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline"
          >
            Leaper One
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          Copyright © 2024 MultiPost. All rights reserved.
        </p>
      </div>
    </div>
  )
}
