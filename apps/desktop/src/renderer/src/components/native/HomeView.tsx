import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  FileTextIcon,
  MessageCircleHeartIcon,
  MessageCircleQuestionIcon,
  PlusIcon,
  PodcastIcon,
  SendIcon,
  UserPlusIcon,
  UsersIcon,
  VideoIcon,
  XCircleIcon,
  XIcon
} from 'lucide-react'

import type { PublishHistory } from '@shared/types'
import { PLATFORMS } from '@shared/constants'
import { useAccountsStore } from '../../store/accounts.store'
import { useUiStore, type NativeView } from '../../store/ui.store'
import { AccountAvatar } from '../AccountAvatar'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { CONTACT_LINKS, openContactLink } from './FeedbackDialog'

interface QuickAction {
  view: NativeView
  label: string
  description: string
  icon: React.ReactNode
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    view: 'publish-dynamic',
    label: '发布动态',
    description: '图文动态一键多发',
    icon: <MessageCircleHeartIcon className="size-5" />
  },
  {
    view: 'publish-video',
    label: '发布视频',
    description: '视频分发到各平台',
    icon: <VideoIcon className="size-5" />
  },
  {
    view: 'publish-article',
    label: '发布文章',
    description: '长文章同步发布',
    icon: <FileTextIcon className="size-5" />
  },
  {
    view: 'publish-podcast',
    label: '发布播客',
    description: '音频节目多平台上架',
    icon: <PodcastIcon className="size-5" />
  }
]

const listContainer = {
  enter: { transition: { staggerChildren: 0.05 } }
}

const listItem = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } }
}

function formatHistoryTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

const ONBOARDING_DISMISSED_KEY = 'multipost.onboardingDismissed'

interface OnboardingStep {
  title: string
  description: string
  icon: React.ReactNode
  view: NativeView
  action: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: '添加账号',
    description: '在账号页登录各平台账号，登录状态会自动保持',
    icon: <UserPlusIcon className="size-4" />,
    view: 'accounts',
    action: '去添加'
  },
  {
    title: '创作内容',
    description: '选择动态/视频/文章/播客，支持拖拽、粘贴上传素材',
    icon: <MessageCircleHeartIcon className="size-4" />,
    view: 'publish-dynamic',
    action: '去创作'
  },
  {
    title: '一键发布',
    description: '勾选要发布的账号，确认后即可一键多发',
    icon: <SendIcon className="size-4" />,
    view: 'publish-dynamic',
    action: '试一试'
  }
]

// First-use guide: visible until the user adds an account or dismisses it.
function OnboardingGuide({
  onNavigate
}: {
  onNavigate: (view: NativeView) => void
}): React.ReactElement | null {
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_DISMISSED_KEY) === '1'
  )

  if (isDismissed) return null

  return (
    <Card className="relative p-5">
      <button
        type="button"
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        onClick={() => {
          localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1')
          setIsDismissed(true)
        }}
        aria-label="不再显示"
        title="不再显示"
      >
        <XIcon className="size-4" />
      </button>
      <h2 className="text-sm font-medium">三步上手 MultiPost</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {ONBOARDING_STEPS.map((step, index) => (
          <div key={step.title} className="flex flex-col gap-2 rounded-lg bg-foreground/[0.03] p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-foreground/[0.05] text-xs font-medium">
                {index + 1}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {step.icon}
                {step.title}
              </span>
            </div>
            <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
              {step.description}
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="self-start"
              onClick={() => onNavigate(step.view)}
            >
              {step.action}
              <ArrowRightIcon />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function greetingByHour(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function HomeView(): React.ReactElement {
  const navigate = useUiStore((state) => state.navigate)
  const accounts = useAccountsStore((state) => state.accounts)
  const [recentHistory, setRecentHistory] = useState<PublishHistory[]>([])

  useEffect(() => {
    let cancelled = false
    void window.api.history
      .list({ limit: 5 })
      .then((items) => {
        if (!cancelled) setRecentHistory(items)
      })
      .catch((error) => console.error('Failed to load history:', error))
    return () => {
      cancelled = true
    }
  }, [])

  const loggedInCount = accounts.filter((account) => account.isLoggedIn).length
  const offlineCount = accounts.length - loggedInCount

  return (
    <motion.div
      variants={listContainer}
      initial="initial"
      animate="enter"
      className="mx-auto flex w-full max-w-screen-xl flex-col gap-6"
    >
      {/* Greeting */}
      <motion.div variants={listItem} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greetingByHour()}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            把内容一键发布到所有平台，今天想发点什么？
          </p>
        </div>
      </motion.div>

      {/* First-use onboarding */}
      <motion.div variants={listItem}>
        <OnboardingGuide onNavigate={navigate} />
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={listItem} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <motion.button
            key={action.view}
            type="button"
            onClick={() => navigate(action.view)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-xl bg-card p-4 text-left before:pointer-events-none before:absolute before:inset-0 before:bg-foreground/[0.03] before:opacity-0 before:transition-opacity hover:before:opacity-100"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-foreground/[0.05] text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {action.icon}
            </span>
            <span>
              <span className="block text-sm font-medium">{action.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{action.description}</span>
            </span>
          </motion.button>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Accounts overview */}
        <motion.div variants={listItem} className="h-full">
          <Card className="flex h-full flex-col p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UsersIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">我的账号</h2>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => navigate('accounts')}
              >
                管理
                <ArrowRightIcon />
              </Button>
            </div>

            {accounts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">还没有添加账号</p>
                <Button size="sm" variant="secondary" onClick={() => navigate('accounts')}>
                  <PlusIcon />
                  添加账号
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {accounts.slice(0, 8).map((account) => (
                      <span
                        key={account.id}
                        title={
                          (account.displayName || account.username || '') +
                          (account.isLoggedIn ? '' : '（需要重新登录）')
                        }
                        className={`rounded-full border-2 border-card ${
                          account.isLoggedIn ? '' : 'grayscale'
                        }`}
                      >
                        <AccountAvatar
                          avatar={account.avatar}
                          platform={account.platform}
                          size={30}
                          showPlatformBadge={false}
                        />
                      </span>
                    ))}
                  </div>
                  {accounts.length > 8 && (
                    <span className="text-xs text-muted-foreground">+{accounts.length - 8}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  共 {accounts.length} 个账号，{loggedInCount} 个在线
                </p>
                {offlineCount > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 self-start text-xs text-destructive hover:underline"
                    onClick={() => navigate('accounts')}
                  >
                    {offlineCount} 个账号需要重新登录
                    <ArrowRightIcon className="size-3" />
                  </button>
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recent history */}
        <motion.div variants={listItem} className="h-full">
          <Card className="flex h-full flex-col p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">最近发布</h2>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => navigate('history')}
              >
                全部
                <ArrowRightIcon />
              </Button>
            </div>

            {recentHistory.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">还没有发布记录</p>
              </div>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-border/60">
                {recentHistory.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 py-2.5 text-sm"
                  >
                    {item.status === 'success' ? (
                      <CheckCircle2Icon className="size-4 shrink-0 text-foreground" />
                    ) : item.status === 'failed' ? (
                      <XCircleIcon className="size-4 shrink-0 text-destructive" />
                    ) : (
                      <CircleIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{item.title || '无标题'}</span>
                    <Badge size="sm" className="shrink-0">
                      {PLATFORMS[item.platform]?.name || item.platform}
                    </Badge>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatHistoryTime(item.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Contact / feedback */}
      <motion.div variants={listItem}>
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-foreground">
              <MessageCircleQuestionIcon className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-medium">遇到问题？联系我们</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                有任何使用问题或想支持新平台，随时反馈，我们会尽快帮你处理。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            {CONTACT_LINKS.map((link) => (
              <Button
                key={link.label}
                size="sm"
                variant="secondary"
                onClick={() => openContactLink(link.url)}
              >
                <link.icon />
                {link.label}
              </Button>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
