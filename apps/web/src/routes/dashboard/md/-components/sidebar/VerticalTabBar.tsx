'use client'

import { Tabs, Tab } from '@heroui/react'
import { FileCode2, FileText, Sparkles, Bot, ImageIcon, FrameIcon } from 'lucide-react'
import { useMdDraftStore } from '@/store/md-draft.store'
import { useTranslation } from '@/src/i18n/client'

const tabs = [
  { key: 'editor', icon: FileCode2, labelKey: 'sidebar.menu.markdown' as const, ns: 'dashboard' as const },
  { key: 'drafts', icon: FileText, labelKey: 'tabs.drafts' as const, ns: 'draft' as const },
  { key: 'ai-polish', icon: Sparkles, labelKey: 'tabs.aiCreation' as const, ns: 'draft' as const },
  { key: 'ai-image', icon: Bot, labelKey: 'tabs.aiImage' as const, ns: 'draft' as const },
  { key: 'ai-poster', icon: FrameIcon, labelKey: 'tabs.aiPoster' as const, ns: 'draft' as const },
  { key: 'media', icon: ImageIcon, labelKey: 'tabs.mediaLibrary' as const, ns: 'draft' as const },
] as const

export default function TopTabBar() {
  const { t } = useTranslation('draft')
  const { t: tDashboard } = useTranslation('dashboard')
  const lastActiveTab = useMdDraftStore(s => s.lastActiveTab)
  const setLastActiveTab = useMdDraftStore(s => s.setLastActiveTab)

  const getLabel = (tab: (typeof tabs)[number]) =>
    tab.ns === 'dashboard' ? tDashboard(tab.labelKey) : t(tab.labelKey)

  return (
    <div className="shrink-0 border-b px-3 pt-1">
      <Tabs
        selectedKey={lastActiveTab}
        onSelectionChange={(key) => setLastActiveTab(key as string)}
        variant="underlined"
        classNames={{
          base: 'w-full',
          tabList: 'gap-4 relative rounded-none p-0 pb-1.5 overflow-x-auto',
          cursor: 'w-full bg-primary',
          tab: 'max-w-fit px-0 h-7',
          tabContent: 'group-data-[selected=true]:text-primary text-default-600 font-medium',
        }}
      >
        {tabs.map(tab => (
          <Tab
            key={tab.key}
            title={
              <div className="flex items-center gap-1.5">
                <tab.icon className="size-3.5" />
                <span className="text-xs">{getLabel(tab)}</span>
              </div>
            }
          />
        ))}
      </Tabs>
    </div>
  )
}
