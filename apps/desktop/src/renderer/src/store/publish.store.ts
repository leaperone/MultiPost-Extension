import { create } from 'zustand'
import { toast } from '../components/ui/sonner'
import type {
  BrowserTab,
  GroupTab,
  PlatformType,
  PublishGroupSummary,
  PublishTargetStatus,
  SyncContentData,
  SyncContentType
} from '@shared/types'
import type { AccountPublishState } from '../components/publish/shared'

interface StartPublishParams {
  contentType: SyncContentType
  data: SyncContentData
  selectedAccountIds: Set<string>
  selectedOtherPlatforms?: Set<PlatformType>
  autoSubmit: boolean
}

const TERMINAL_STATUSES: PublishTargetStatus[] = ['success', 'failed', 'cancelled']

export function isTerminalTargetStatus(status: PublishTargetStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

interface PublishState {
  isStarting: boolean
  /** Group created by the most recent publish from this window. */
  activeGroupId: string | null
  activeContentType: SyncContentType | null
  autoPublish: boolean
  targets: AccountPublishState[]
  summary: PublishGroupSummary | null
  /**
   * Creates a publish group for the selected saved accounts (the group tab
   * takes over fill/submit progress) and fires simple-mode publishes for
   * platforms without a bound account.
   */
  startPublish: (params: StartPublishParams) => Promise<boolean>
  skipTarget: (accountId: string) => Promise<void>
  retryTarget: (accountId: string) => Promise<void>
  /** Submits every filled-and-waiting target of the active group（手动确认模式的「全部发布」）. */
  submitAllReady: () => Promise<void>
  clearProgress: () => void
}

function tabsToTargets(tabs: GroupTab[]): AccountPublishState[] {
  return tabs.map((tab) => ({
    accountId: tab.id,
    platform: tab.platform,
    displayName: tab.displayName,
    status: tab.status,
    step: tab.step,
    error: tab.error,
    postUrl: tab.postUrl
  }))
}

// ---------------------------------------------------------------------------
// 发布进度 toast：每个发布组一条粘性 toast（同 id 原地更新），让用户离开发布页
// 后仍能感知「现在到哪一步、下一步要做什么」。仅在原生页面可见（Toaster 挂在
// tabBarView renderer；平台 BrowserView 激活时 chrome 收缩为顶栏），这是
// 已接受的产品范围。
// ---------------------------------------------------------------------------

function publishToastId(groupId: string): string {
  return `publish-group-${groupId}`
}

// groupTabsChanged 高频触发，而 sonner 对同 id 的每次调用都会重放动画；
// 按 groupId + 内容签名去重，内容没变就不重渲染。
let lastToastSignature: { groupId: string; signature: string } | null = null

// group tab 是异步出现的，必须先「见过」当前 active group 的 tab，
// 之后的消失才算「被关闭」（见文件底部的 onTabsChanged 监听）。
let hasSeenActiveGroupTab = false

function resetToastCache(): void {
  lastToastSignature = null
}

// main 下发的 step 偶尔为空（状态刚切换时），按 status 给个兜底文案。
const FALLBACK_STEPS: Partial<Record<PublishTargetStatus, string>> = {
  pending: '排队中…',
  filling: '填充内容…',
  ready: '等待提交…'
}

type PublishToastKind = 'loading' | 'action' | 'success' | 'error' | 'info'

function emitPublishToast(
  groupId: string,
  kind: PublishToastKind,
  title: string,
  description?: string
): void {
  const signature = `${kind}|${title}|${description ?? ''}`
  if (lastToastSignature?.groupId === groupId && lastToastSignature.signature === signature) {
    return
  }
  lastToastSignature = { groupId, signature }

  const id = publishToastId(groupId)
  switch (kind) {
    case 'loading':
      toast.loading(title, { id, description, duration: Infinity })
      break
    // 等用户动作的状态：常驻但不转圈（转圈会误导成「还在自动处理」）
    case 'action':
      toast(title, { id, description, duration: Infinity })
      break
    case 'success':
      toast.success(title, { id, description, duration: 5000 })
      break
    case 'error':
      toast.error(title, { id, description, duration: 8000 })
      break
    case 'info':
      toast(title, { id, description, duration: 5000 })
      break
  }
}

function renderGroupProgressToast(
  groupId: string,
  targets: AccountPublishState[],
  autoPublish: boolean
): void {
  if (targets.length === 0) return

  const terminalCount = targets.filter((target) => isTerminalTargetStatus(target.status)).length
  const nonTerminal = targets.filter((target) => !isTerminalTargetStatus(target.status))
  // 全终态由 groupSummary 收束（retry 后 main 会重发 summary），这里不抢跑。
  if (nonTerminal.length === 0) return

  if (!autoPublish && nonTerminal.every((target) => target.status === 'ready')) {
    emitPublishToast(
      groupId,
      'action',
      '内容已填好，等你确认',
      '去各平台页面检查内容，或回发布页点「全部发布」。'
    )
    return
  }

  const active =
    nonTerminal.find((target) => target.status === 'filling') ??
    nonTerminal.find((target) => target.status === 'pending') ??
    nonTerminal[0]
  const step = active.step || FALLBACK_STEPS[active.status] || '处理中…'
  const hint = autoPublish ? ' 填好后会自动提交。' : ''
  emitPublishToast(
    groupId,
    'loading',
    `正在发布 · ${terminalCount}/${targets.length} 已完成`,
    `${active.displayName}：${step}${hint}`
  )
}

export const usePublishStore = create<PublishState>((set, get) => ({
  isStarting: false,
  activeGroupId: null,
  activeContentType: null,
  autoPublish: false,
  targets: [],
  summary: null,

  startPublish: async ({ contentType, data, selectedAccountIds, selectedOtherPlatforms, autoSubmit }) => {
    set({ isStarting: true })
    try {
      // Fetch fresh accounts at publish time: the selector UI loads its own
      // list over IPC, so a cached store snapshot could miss recent changes.
      const accounts = await window.api.account.list()
      const targets = accounts
        .filter((account) => selectedAccountIds.has(account.id))
        .map((account) => ({
          accountId: account.id,
          platform: account.platform,
          displayName: account.displayName || account.username || account.platform
        }))

      const otherPlatforms = Array.from(selectedOtherPlatforms ?? [])

      if (targets.length === 0 && otherPlatforms.length === 0) {
        toast('还没选择发布目标', {
          description: '勾选至少一个账号或平台后再发布。'
        })
        return false
      }

      if (targets.length > 0) {
        const previousGroupId = get().activeGroupId
        const groupId = await window.api.publishGroup.create({
          contentType,
          targets,
          data,
          autoPublish: autoSubmit
        })
        // 旧 group 的粘性 toast 在新 group 确认创建成功后再清，创建失败时不动它。
        if (previousGroupId && previousGroupId !== groupId) {
          toast.dismiss(publishToastId(previousGroupId))
        }
        resetToastCache()
        hasSeenActiveGroupTab = false
        set({
          activeGroupId: groupId,
          activeContentType: contentType,
          autoPublish: autoSubmit,
          summary: null,
          targets: targets.map((target) => ({
            ...target,
            status: 'pending' as PublishTargetStatus,
            step: '准备中…'
          }))
        })
        emitPublishToast(
          groupId,
          'loading',
          `开始发布到 ${targets.length} 个账号…`,
          autoSubmit ? '会自动填充并提交，进度看这里。' : '会先填好内容，提交前等你确认。'
        )
      }

      // 逐平台兜错：组已创建成功时，个别平台页没打开不应整体报「创建失败」。
      let openedCount = 0
      let failedCount = 0
      for (const platform of otherPlatforms) {
        try {
          await window.api.publish.start(platform, contentType, data, autoSubmit)
          openedCount += 1
        } catch (error) {
          console.error(`Failed to start simple-mode publish for ${platform}:`, error)
          failedCount += 1
        }
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} 个平台页面没打开`, {
          description: `已打开 ${openedCount} 个；没打开的稍后回发布页重试。`
        })
      } else if (openedCount > 0) {
        toast(`已打开 ${openedCount} 个平台页面`, {
          description: '这些平台没有绑定账号，去对应页面里确认发布。'
        })
      }

      return true
    } catch (error) {
      console.error('Failed to start publish:', error)
      const reason = error instanceof Error ? error.message : ''
      toast.error('发布任务没能创建', {
        description: `${reason ? `${reason}。` : ''}请再点一次发布；若反复失败，重启应用后重试。`
      })
      return false
    } finally {
      set({ isStarting: false })
    }
  },

  skipTarget: async (accountId) => {
    const { activeGroupId } = get()
    if (!activeGroupId) return
    try {
      await window.api.publishGroup.skipTarget(activeGroupId, accountId)
    } catch (error) {
      console.error('Failed to skip publish target:', error)
    }
  },

  retryTarget: async (accountId) => {
    const { activeGroupId } = get()
    if (!activeGroupId) return
    // 终态 toast 后 retry 会让同一 group 回到进行中；清掉签名缓存，
    // 即便首个事件文案与上轮相同也能把 toast 切回 loading 态。
    resetToastCache()
    set({ summary: null })
    try {
      await window.api.publishGroup.retryTarget(activeGroupId, accountId)
    } catch (error) {
      console.error('Failed to retry publish target:', error)
      toast.error('重试没能开始', {
        description: '该账号的发布未能重新执行，稍等片刻再点一次重试。'
      })
    }
  },

  submitAllReady: async () => {
    const { activeGroupId } = get()
    if (!activeGroupId) return
    try {
      await window.api.publishGroup.submitAll(activeGroupId)
    } catch (error) {
      console.error('Failed to submit all ready targets:', error)
      toast.error('发布指令没发出去', {
        description: '已填充的内容仍保留在各平台页面，稍后再点一次「全部发布」。'
      })
    }
  },

  clearProgress: () => {
    const { activeGroupId, summary } = get()
    // 进行中的粘性 toast 随进度一起清；终态 toast 有限时，让它自然消失。
    if (activeGroupId && !summary) {
      toast.dismiss(publishToastId(activeGroupId))
    }
    resetToastCache()
    hasSeenActiveGroupTab = false
    set({ activeGroupId: null, activeContentType: null, targets: [], summary: null })
  }
}))

// Live progress: the main process re-broadcasts group tabs (status + step +
// error) on every change; mirror the active group into the store.
window.api.publishGroup.onGroupTabsChanged((data) => {
  const { activeGroupId, autoPublish } = usePublishStore.getState()
  if (!activeGroupId || data.groupId !== activeGroupId) return
  if (data.tabs.length === 0) return
  const targets = tabsToTargets(data.tabs)
  usePublishStore.setState({ targets })
  renderGroupProgressToast(activeGroupId, targets, autoPublish)
})

// Run summary: fired once when every target is terminal.
window.api.publishGroup.onGroupSummary((summary) => {
  const { activeGroupId } = usePublishStore.getState()
  if (!activeGroupId || summary.groupId !== activeGroupId) return
  usePublishStore.setState({ summary })

  const successCount = summary.targets.filter((target) => target.status === 'success').length
  const failedCount = summary.targets.filter((target) => target.status === 'failed').length
  const cancelledCount = summary.targets.filter((target) => target.status === 'cancelled').length
  const counts = [
    successCount > 0 ? `成功 ${successCount}` : '',
    failedCount > 0 ? `失败 ${failedCount}` : '',
    cancelledCount > 0 ? `已跳过 ${cancelledCount}` : ''
  ]
    .filter(Boolean)
    .join(' · ')

  if (failedCount > 0) {
    emitPublishToast(
      summary.groupId,
      'error',
      `发布完成，${failedCount} 个失败`,
      `${counts}，去发布页查看失败原因并重试。`
    )
  } else if (successCount > 0) {
    emitPublishToast(
      summary.groupId,
      'success',
      '发布完成',
      successCount === summary.targets.length ? `${successCount} 个账号全部成功。` : `${counts}。`
    )
  } else {
    emitPublishToast(summary.groupId, 'info', '发布已结束', '所有账号都已跳过。')
  }
})

// 用户可以从标签栏直接关闭发布组（main 只更新 tabs、不发 summary），
// 不监听这里的话进行中的粘性 toast 会永久残留。
window.api.browser.onTabsChanged((tabs: BrowserTab[]) => {
  const { activeGroupId, summary, clearProgress } = usePublishStore.getState()
  if (!activeGroupId) {
    hasSeenActiveGroupTab = false
    return
  }
  const groupTabPresent = tabs.some((tab) => tab.isGroup && tab.groupId === activeGroupId)
  if (groupTabPresent) {
    hasSeenActiveGroupTab = true
    return
  }
  if (!hasSeenActiveGroupTab) return
  hasSeenActiveGroupTab = false
  // 已终态（如发布成功后自动关组）：结果 toast 与 summary 都保留。
  if (summary) return
  toast.dismiss(publishToastId(activeGroupId))
  toast('发布已停止', { description: '发布页面被关闭，本次发布未完成。' })
  clearProgress()
})
