import { create } from 'zustand'
import { addToast } from '@heroui/react'
import type { PlatformType, SyncContentData, SyncContentType } from '@shared/types'

interface StartPublishParams {
  contentType: SyncContentType
  data: SyncContentData
  selectedAccountIds: Set<string>
  selectedOtherPlatforms?: Set<PlatformType>
  autoSubmit: boolean
}

interface PublishState {
  isStarting: boolean
  /**
   * Creates a publish group for the selected saved accounts (the group tab
   * takes over fill/submit progress) and fires simple-mode publishes for
   * platforms without a bound account.
   */
  startPublish: (params: StartPublishParams) => Promise<boolean>
}

export const usePublishStore = create<PublishState>((set) => ({
  isStarting: false,

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

      if (targets.length > 0) {
        await window.api.publishGroup.create({
          contentType,
          targets,
          data,
          autoPublish: autoSubmit
        })
      }

      for (const platform of selectedOtherPlatforms ?? []) {
        await window.api.publish.start(platform, contentType, data, autoSubmit)
      }

      if (targets.length === 0 && (selectedOtherPlatforms?.size ?? 0) === 0) {
        addToast({ title: '请选择账号', description: '至少选择一个发布目标', hideIcon: true })
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to start publish:', error)
      addToast({ title: '发布失败', description: '无法创建发布任务，请重试', hideIcon: true })
      return false
    } finally {
      set({ isStarting: false })
    }
  }
}))
