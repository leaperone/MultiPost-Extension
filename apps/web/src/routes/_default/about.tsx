import { createFileRoute } from '@tanstack/react-router';
import { Button, Link } from '@heroui/react';
import { Github, Mail, Users, Heart, Code, Zap } from 'lucide-react';

import { routeMeta } from '../../lib/seo';

export const Route = createFileRoute('/_default/about')({
  head: () => ({
    meta: routeMeta({
      title: 'About MultiPost - Open Source Social Media Publishing Tool',
      description:
        'Learn about MultiPost, an open-source multi-platform social media publishing tool by LEAPERone. Discover our mission, values, team, and how we help content creators save 80% of publishing time.',
    }),
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-24">
      {/* Hero Section */}
      <div className="mb-16 text-center">
        <h1 className="mb-6 text-4xl font-bold md:text-5xl">关于 MultiPost</h1>
        <p className="mx-auto max-w-2xl text-xl text-foreground/70">
          一款开源的多平台社交媒体内容发布工具，由社区构建，为创作者服务。
        </p>
      </div>

      {/* Mission Section */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold">我们的使命</h2>
        <div className="space-y-4 text-foreground/80">
          <p>
            在当今的社交媒体时代，内容创作者面临着一个共同的挑战：如何高效地将内容发布到多个平台？每个平台都有不同的界面、格式要求和发布流程，这使得跨平台内容分发变得繁琐且耗时。
          </p>
          <p>
            <strong>MultiPost 的诞生正是为了解决这个问题。</strong>我们相信，创作者应该把时间花在创作优质内容上，而不是在各个平台之间来回切换、重复粘贴。通过 MultiPost，您只需编辑一次内容，就能一键发布到微博、小红书、Twitter、LinkedIn 等多个社交媒体平台。
          </p>
          <p>
            我们致力于打造一个简单、高效、开放的内容发布工具，帮助每一位内容创作者提升工作效率，扩大影响力。
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="mb-16">
        <h2 className="mb-8 text-2xl font-semibold">我们的价值观</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Code className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">开源透明</h3>
            <p className="text-sm text-foreground/70">
              MultiPost 浏览器扩展完全开源，代码公开透明。任何人都可以审查我们的代码，了解数据如何被处理，确保您的隐私安全。
            </p>
          </div>

          <div className="rounded-xl border p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Users className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">社区驱动</h3>
            <p className="text-sm text-foreground/70">
              我们的发展由社区推动。用户的反馈塑造了产品的方向，开发者的贡献让功能不断完善。每一个 Issue 和 PR 都是产品进步的动力。
            </p>
          </div>

          <div className="rounded-xl border p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Zap className="size-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">简单高效</h3>
            <p className="text-sm text-foreground/70">
              我们追求极简的用户体验。复杂的功能隐藏在简洁的界面之后，让您专注于内容创作本身，而不是工具的使用方法。
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold">我们提供什么</h2>
        <div className="space-y-4 text-foreground/80">
          <p>MultiPost 为内容创作者提供一站式的社交媒体管理解决方案：</p>
          <ul className="ml-6 list-disc space-y-2">
            <li><strong>多平台一键发布</strong> — 支持微博、小红书、Twitter/X、LinkedIn、知乎、今日头条等 10+ 主流社交媒体平台</li>
            <li><strong>智能内容适配</strong> — 自动优化内容格式，适应不同平台的要求</li>
            <li><strong>草稿云端管理</strong> — 在任何设备上编辑和管理您的内容草稿</li>
            <li><strong>AI 辅助创作</strong> — 利用人工智能帮助您优化文案、生成创意</li>
            <li><strong>图片和海报生成</strong> — 快速创建适合社交媒体分享的视觉内容</li>
            <li><strong>视频文案提取</strong> — 从抖音、TikTok 视频中智能提取文字内容</li>
          </ul>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold">开源项目</h2>
        <div className="rounded-xl border p-6">
          <div className="mb-4 flex items-center gap-3">
            <Github className="size-8" />
            <div>
              <h3 className="text-lg font-semibold">MultiPost-Extension</h3>
              <p className="text-sm text-foreground/60">github.com/leaper-one/MultiPost-Extension</p>
            </div>
          </div>
          <p className="mb-4 text-foreground/80">
            MultiPost 浏览器扩展是一个开源项目，采用开源许可证发布。我们欢迎任何形式的贡献：无论是提交 Bug 报告、功能建议，还是直接贡献代码。
          </p>
          <div className="flex flex-wrap gap-3">
            <img
              src="https://img.shields.io/github/stars/leaper-one/MultiPost-Extension?style=flat&logo=github&color=yellow"
              alt="GitHub Stars"
              className="h-5"
              width={100}
              height={20}
            />
            <img
              src="https://img.shields.io/github/forks/leaper-one/MultiPost-Extension?style=flat&logo=github&color=blue"
              alt="GitHub Forks"
              className="h-5"
              width={100}
              height={20}
            />
            <img
              src="https://img.shields.io/github/issues/leaper-one/MultiPost-Extension?style=flat&logo=github&color=green"
              alt="GitHub Issues"
              className="h-5"
              width={100}
              height={20}
            />
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold">关于我们的团队</h2>
        <div className="space-y-4 text-foreground/80">
          <p>
            MultiPost 由 <strong>LEAPERone</strong> 团队开发和维护。我们是一支热爱技术、专注于提升创作者效率的团队，总部位于中国珠海。
          </p>
          <p>
            我们相信开源的力量，也感谢每一位为 MultiPost 做出贡献的社区成员。正是你们的支持和反馈，让 MultiPost 不断进步。
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold">联系我们</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-4 rounded-xl border p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Mail className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">电子邮件</p>
              <a href="mailto:support@leaper.one" className="font-medium hover:text-blue-600">
                support@leaper.one
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Users className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">QQ 群</p>
              <p className="font-medium">921137242</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <Github className="size-5" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">GitHub</p>
              <a
                href="https://github.com/leaper-one/MultiPost-Extension"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-blue-600">
                MultiPost-Extension
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Heart className="size-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">Discord</p>
              <a
                href="https://discord.gg/multipost"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-blue-600">
                加入社区
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-8 text-center">
        <h2 className="mb-4 text-2xl font-semibold">准备好提升您的内容发布效率了吗？</h2>
        <p className="mb-6 text-foreground/70">
          立即安装 MultiPost 浏览器扩展，体验一键多平台发布的便捷。
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/extension">
            <Button color="primary" size="lg">
              安装扩展
            </Button>
          </Link>
          <Link href="https://github.com/leaper-one/MultiPost-Extension" target="_blank">
            <Button variant="bordered" size="lg" startContent={<Github className="size-4" />}>
              查看源码
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
