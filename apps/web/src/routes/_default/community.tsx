import { createFileRoute } from '@tanstack/react-router';
import { Github, Puzzle, Monitor, Bug, Heart, Wrench } from 'lucide-react';

import { useLocale } from '../../i18n/locale-provider';
import { routeMeta } from '../../lib/seo';
import CommunityReportTrigger from './-CommunityReportTrigger';

export const Route = createFileRoute('/_default/community')({
  head: () => ({
    meta: routeMeta({
      title: 'Community & Contribution Guide - MultiPost',
      description:
        'Help maintain MultiPost: each social platform changes frequently and the adapter behind every Publish click needs caretakers. Learn how to report failures, build new platform support, and join the community.',
    }),
  }),
  component: CommunityPage,
});

interface Section {
  heading: string;
  body: string[];
}

interface Copy {
  title: string;
  tagline: string;
  reportCtaTitle: string;
  reportCtaSubtitle: string;
  reportCtaButton: string;
  background: Section;
  pain: Section;
  contributeTitle: string;
  contributeIntro: string;
  contributors: {
    extension: { title: string; body: string; link: string };
    desktop: { title: string; body: string; link: string };
    issues: { title: string; body: string; link: string };
  };
  flowTitle: string;
  flowSteps: string[];
  thanksTitle: string;
  thanksBody: string;
}

const ZH: Copy = {
  title: '一起把 MultiPost 维护下去',
  tagline:
    'MultiPost 是一个开源的多平台发布工具，每一个能用的"发布"按钮背后，都对应着一份持续被维护的平台适配器。',
  reportCtaTitle: '遇到平台失效？',
  reportCtaSubtitle:
    '直接告诉我们：哪个平台、什么操作下、报错是什么。你的反馈会直接进入 Sentry 和工单系统，由维护者优先排查。',
  reportCtaButton: '上报平台问题',
  background: {
    heading: '我们为什么需要你',
    body: [
      'MultiPost 同时接入了 40 多个社交媒体平台，包括微博、小红书、抖音、B 站、Twitter/X、Threads、LinkedIn 等。每一个平台的发布流程都不一样——网页结构、内容字段、媒体规格、登录态校验……我们用浏览器扩展和桌面端各写了一份"适配器"，模拟用户在每个平台真实的发布动作。',
      '问题在于：这些平台经常改版。今天能发布的页面，明天 DOM 一改，按钮就找不到了。核心团队没办法在每一次改版后立刻覆盖所有平台，于是真正在用的你，往往比我们更早发现"哪个平台又坏了"。',
    ],
  },
  pain: {
    heading: '当前的痛点',
    body: [
      '维护成本随平台数量线性增长，但每个平台的用户量分布很不均匀；',
      '很多平台的 DOM 没有稳定 ID/data-attr，每一次升级都需要重新踩点；',
      '核心团队带宽有限，希望把"日常巡检"分散给真正在使用某个平台的开发者；',
      '如果失效在用户侧静默发生，我们直到收到工单才知道——这就是为什么我们需要"一键上报"。',
    ],
  },
  contributeTitle: '你可以这样参与',
  contributeIntro:
    'MultiPost 大部分核心模块是开源的。下面三条路线，按你熟悉的栈和时间预算挑一个即可：',
  contributors: {
    extension: {
      title: '浏览器扩展（Plasmo + React）',
      body:
        'MultiPost-Extension 是一个开源浏览器扩展，承担网页端的发布工作。每个平台都对应一个 content script，负责定位输入框、上传文件、点击发布。修复失效或新增平台从这里开始最轻量。',
      link: 'https://github.com/leaperone/MultiPost-Extension',
    },
    desktop: {
      title: '桌面端平台适配器（Electron + TypeScript）',
      body:
        '桌面端通过 Electron BrowserView 加载平台原站，并在每个站点注入对应的 platform 脚本。所有适配器集中在 apps/desktop/src/main/platforms/ 下，twitter.ts、weibo.ts 等可以作为参考模板。新增一个平台一般是 100 - 300 行代码的工作量。',
      link: 'https://github.com/leaperone/MultiPost-Desktop',
    },
    issues: {
      title: '提交 Issue 或反馈',
      body:
        '不写代码也能帮上忙：在使用过程中如果发现某个平台行为异常，直接通过本页面上方的"上报平台问题"按钮发送，或者在 GitHub 提 Issue，附上平台、操作步骤、截图。每一条反馈都会进入我们的修复列表。',
      link: 'https://github.com/leaperone/MultiPost-Extension/issues/new/choose',
    },
  },
  flowTitle: '贡献流程',
  flowSteps: [
    'Fork 对应仓库（Extension 或 Desktop），创建 feature/ 分支',
    '本地按 README 跑起来，找到要修复或新增的平台适配器',
    '改完后提交 PR，描述里写清楚：影响哪个平台、修复什么场景、有没有手动验证',
    '维护者会做 review，并把变更纳入下一个版本',
  ],
  thanksTitle: '致每一位贡献者',
  thanksBody:
    'MultiPost 由 LEAPERone 团队发起，但能跑到今天靠的是社区一次次提交的 PR、Issue 和反馈。每一个修复，都是替成百上千的创作者节省时间。',
};

const EN: Copy = {
  title: 'Help keep MultiPost working',
  tagline:
    'MultiPost is an open-source multi-platform publishing tool. Every working "Publish" button is backed by an adapter that someone has to keep alive.',
  reportCtaTitle: 'A platform stopped working?',
  reportCtaSubtitle:
    'Tell us which platform, what you did, what broke. Your report flows straight into Sentry and the maintainers triage from there.',
  reportCtaButton: 'Report platform issue',
  background: {
    heading: 'Why we need you',
    body: [
      'MultiPost integrates with 40+ social platforms — Weibo, Xiaohongshu, Douyin, Bilibili, Twitter/X, Threads, LinkedIn and more. Each one has its own publish flow: different DOM, different content fields, different media specs, different auth state. We mimic the real user journey through a browser extension and a desktop client. That is a lot of adapters.',
      'The problem: these platforms ship redesigns constantly. A button that worked yesterday is gone today. The core team cannot patch every adapter the moment a redesign lands — but you, the actual user of a specific platform, usually notice the regression before we do.',
    ],
  },
  pain: {
    heading: 'The current pain',
    body: [
      'Maintenance cost scales with platform count, but user activity is uneven across platforms.',
      'Many platforms ship DOM without stable IDs / data attributes; every redesign requires fresh detective work.',
      'Core team bandwidth is finite, and we would rather distribute the day-to-day patrol to developers who actually use a given platform.',
      'When a regression happens silently on the user side, we only learn about it from support tickets — exactly the gap "one-click report" closes.',
    ],
  },
  contributeTitle: 'Ways to contribute',
  contributeIntro:
    'Most of MultiPost is open source. Pick whichever lane matches your stack and time budget:',
  contributors: {
    extension: {
      title: 'Browser extension (Plasmo + React)',
      body:
        'MultiPost-Extension is the open-source browser extension that handles publishing inside the platform sites. Each platform has its own content script that finds inputs, uploads files, and clicks publish. Fixing a regression or adding a new platform usually starts here.',
      link: 'https://github.com/leaperone/MultiPost-Extension',
    },
    desktop: {
      title: 'Desktop adapters (Electron + TypeScript)',
      body:
        'The desktop client loads platform sites inside an Electron BrowserView and injects per-platform scripts. All adapters live in apps/desktop/src/main/platforms/; twitter.ts / weibo.ts are good templates. Adding a new platform is typically a 100-300 LOC change.',
      link: 'https://github.com/leaperone/MultiPost-Desktop',
    },
    issues: {
      title: 'File an issue or feedback',
      body:
        'You do not have to write code to help. If something behaves wrong, hit the "Report platform issue" button above, or open a GitHub issue with the platform, steps, and a screenshot. Every report enters the maintenance queue.',
      link: 'https://github.com/leaperone/MultiPost-Extension/issues/new/choose',
    },
  },
  flowTitle: 'Contribution flow',
  flowSteps: [
    'Fork the relevant repo (Extension or Desktop), create a feature/ branch.',
    'Run it locally per the README, find the adapter you want to fix or add.',
    'Open a PR with a clear note: which platform, which scenario, manual verification steps.',
    'A maintainer reviews and rolls the change into the next release.',
  ],
  thanksTitle: 'A note to contributors',
  thanksBody:
    'MultiPost is led by the LEAPERone team, but every patch shipped by the community has saved hours for thousands of creators. Thank you for keeping this thing running.',
};

function CommunityPage() {
  const lang = useLocale();
  const copy = lang === 'zh-CN' ? ZH : EN;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24">
      {/* Hero */}
      <header className="mb-12 text-center">
        <h1 className="mb-4 text-3xl font-bold md:text-5xl">{copy.title}</h1>
        <p className="mx-auto max-w-2xl text-base text-foreground/70 md:text-lg">{copy.tagline}</p>
      </header>

      {/* Top CTA */}
      <section className="mb-16 rounded-2xl border p-6 md:p-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Bug className="mt-1 size-6" />
            <div>
              <h2 className="mb-1 text-lg font-semibold">{copy.reportCtaTitle}</h2>
              <p className="text-sm text-foreground/70">{copy.reportCtaSubtitle}</p>
            </div>
          </div>
          <CommunityReportTrigger label={copy.reportCtaButton} />
        </div>
      </section>

      {/* Background */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold">{copy.background.heading}</h2>
        <div className="space-y-4 text-foreground/80">
          {copy.background.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      {/* Pain */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold">{copy.pain.heading}</h2>
        <ul className="list-disc space-y-2 pl-6 text-foreground/80">
          {copy.pain.body.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Contribute lanes */}
      <section className="mb-12">
        <h2 className="mb-2 text-2xl font-semibold">{copy.contributeTitle}</h2>
        <p className="mb-6 text-foreground/70">{copy.contributeIntro}</p>
        <div className="grid gap-4 md:grid-cols-3">
          <ContributionCard
            icon={<Puzzle className="size-6" />}
            title={copy.contributors.extension.title}
            body={copy.contributors.extension.body}
            href={copy.contributors.extension.link}
          />
          <ContributionCard
            icon={<Monitor className="size-6" />}
            title={copy.contributors.desktop.title}
            body={copy.contributors.desktop.body}
            href={copy.contributors.desktop.link}
          />
          <ContributionCard
            icon={<Wrench className="size-6" />}
            title={copy.contributors.issues.title}
            body={copy.contributors.issues.body}
            href={copy.contributors.issues.link}
          />
        </div>
      </section>

      {/* Flow */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold">{copy.flowTitle}</h2>
        <ol className="list-decimal space-y-2 pl-6 text-foreground/80">
          {copy.flowSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {/* Thanks */}
      <section className="mb-16 rounded-2xl border p-6 md:p-8">
        <div className="flex items-start gap-3">
          <Heart className="mt-1 size-6" />
          <div>
            <h2 className="mb-2 text-lg font-semibold">{copy.thanksTitle}</h2>
            <p className="text-foreground/70">{copy.thanksBody}</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-foreground/60">
              <Github className="size-4" />
              <a
                href="https://github.com/leaperone"
                target="_blank"
                rel="noopener noreferrer"
                className="underline">
                github.com/leaperone
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-2xl border p-6 md:p-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Bug className="mt-1 size-6" />
            <div>
              <h2 className="mb-1 text-lg font-semibold">{copy.reportCtaTitle}</h2>
              <p className="text-sm text-foreground/70">{copy.reportCtaSubtitle}</p>
            </div>
          </div>
          <CommunityReportTrigger label={copy.reportCtaButton} />
        </div>
      </section>
    </div>
  );
}

function ContributionCard({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full flex-col gap-3 rounded-xl border p-5 transition-colors hover:bg-default-100">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-foreground/70">{body}</p>
      <span className="mt-auto inline-flex items-center gap-1 text-sm text-foreground/60">
        <Github className="size-3.5" />
        <span className="underline">GitHub</span>
      </span>
    </a>
  );
}
