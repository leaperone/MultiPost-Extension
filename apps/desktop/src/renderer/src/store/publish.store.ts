import { create } from 'zustand'
import { toast } from '../components/ui/sonner'
import type {
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

      if (targets.length === 0 && (selectedOtherPlatforms?.size ?? 0) === 0) {
        toast('还没选择发布目标', {
          description: '勾选至少一个账号或平台后再发布。'
        })
        return false
      }

      if (targets.length > 0) {
        const groupId = await window.api.publishGroup.create({
          contentType,
          targets,
          data,
          autoPublish: autoSubmit
        })
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
      }

      for (const platform of selectedOtherPlatforms ?? []) {
        await window.api.publish.start(platform, contentType, data, autoSubmit)
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
    set({ activeGroupId: null, activeContentType: null, targets: [], summary: null })
  }
}))

// Live progress: the main process re-broadcasts group tabs (status + step +
// error) on every change; mirror the active group into the store.
window.api.publishGroup.onGroupTabsChanged((data) => {
  const { activeGroupId } = usePublishStore.getState()
  if (!activeGroupId || data.groupId !== activeGroupId) return
  if (data.tabs.length === 0) return
  usePublishStore.setState({ targets: tabsToTargets(data.tabs) })
})

// Run summary: fired once when every target is terminal.
window.api.publishGroup.onGroupSummary((summary) => {
  const { activeGroupId } = usePublishStore.getState()
  if (!activeGroupId || summary.groupId !== activeGroupId) return
  usePublishStore.setState({ summary })
})
