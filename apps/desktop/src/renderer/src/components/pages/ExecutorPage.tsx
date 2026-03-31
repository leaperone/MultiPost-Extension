import { useState } from 'react'
import { Terminal, X, ArrowLeft, Eye, RotateCcw, XCircle, CheckCircle, Loader2, Clock, AlertCircle } from 'lucide-react'
import { Button, Chip } from '@heroui/react'
import type { PlatformType } from '@shared/types'
import { PLATFORMS } from '@shared/constants'
import type { AccountPublishState, PublishStatus } from '../publish/shared'

type ExecutorView = 'overview' | 'detail'

// Executor account info
interface ExecutorAccountInfo {
  accountId: string
  platform: PlatformType
  displayName?: string
}

interface ExecutorPageProps {
  openAccounts: ExecutorAccountInfo[]
  activeAccountId: string | null
  publishStates: AccountPublishState[]
  onSwitchAccount: (accountId: string) => void
  onCloseAccount: (accountId: string) => void
  onViewAccount: (accountId: string) => void
  onRetryAccount: (accountId: string) => void
  onCancelAccount: (accountId: string) => void
}

// Status icon component
function StatusIcon({ status }: { status: PublishStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="size-4 text-green-500" />
    case 'failed':
      return <AlertCircle className="size-4 text-red-500" />
    case 'processing':
      return <Loader2 className="size-4 text-blue-500 animate-spin" />
    case 'pending':
      return <Clock className="size-4 text-muted-foreground" />
    case 'cancelled':
      return <XCircle className="size-4 text-muted-foreground" />
    default:
      return <Clock className="size-4 text-muted-foreground" />
  }
}

// Status chip component
function StatusChip({ status, message }: { status: PublishStatus; message?: string }) {
  const colorMap: Record<PublishStatus, 'success' | 'danger' | 'primary' | 'default' | 'warning'> = {
    completed: 'success',
    failed: 'danger',
    processing: 'primary',
    pending: 'default',
    cancelled: 'default',
    idle: 'default'
  }
  return (
    <Chip size="sm" color={colorMap[status]} variant="flat">
      {message || status}
    </Chip>
  )
}

export function ExecutorPage({
  openAccounts,
  activeAccountId,
  publishStates,
  onSwitchAccount,
  onCloseAccount,
  onViewAccount,
  onRetryAccount,
  onCancelAccount
}: ExecutorPageProps): React.ReactElement {
  const [currentView, setCurrentView] = useState<ExecutorView>('overview')

  // Get publish state for an account
  const getPublishState = (accountId: string): AccountPublishState | undefined => {
    return publishStates.find((s) => s.accountId === accountId)
  }

  // Get display label for an account
  const getAccountLabel = (account: ExecutorAccountInfo): string => {
    const platformInfo = PLATFORMS[account.platform]
    if (account.displayName) {
      return `${platformInfo?.name || account.platform} (${account.displayName})`
    }
    return platformInfo?.name || account.platform
  }

  // Handle view account detail
  const handleViewDetail = (accountId: string) => {
    onViewAccount(accountId)
    setCurrentView('detail')
  }

  // Handle back to overview
  const handleBackToOverview = () => {
    setCurrentView('overview')
    window.api.executor.hideAll()
  }

  // Empty state when no accounts are open
  if (openAccounts.length === 0 && publishStates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Terminal className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">执行器</h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          发布时会自动打开执行器浏览器，观察和调试发布执行流程。
        </p>
      </div>
    )
  }

  // Overview view - shows all accounts and their status
  if (currentView === 'overview') {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold">执行器总览</h2>
          <p className="text-sm text-muted-foreground">
            查看所有账号的发布状态
          </p>
        </div>

        {/* Account list with status */}
        <div className="space-y-2">
          {/* Show accounts with publish states first */}
          {publishStates.map((state) => {
            const account = openAccounts.find((a) => a.accountId === state.accountId)
            const platformInfo = PLATFORMS[state.platform]
            const label = state.displayName
              ? `${platformInfo?.name || state.platform} (${state.displayName})`
              : platformInfo?.name || state.platform

            return (
              <div
                key={state.accountId}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <StatusIcon status={state.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {state.message}
                  </div>
                </div>
                <StatusChip status={state.status} message={state.message} />
                <div className="flex items-center gap-1">
                  {account && (
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      onPress={() => handleViewDetail(state.accountId)}
                      title="查看详情"
                    >
                      <Eye className="size-4" />
                    </Button>
                  )}
                  {state.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      onPress={() => onRetryAccount(state.accountId)}
                      title="重试"
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                  )}
                  {(state.status === 'pending' || state.status === 'processing') && (
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      onPress={() => onCancelAccount(state.accountId)}
                      title="取消"
                    >
                      <XCircle className="size-4" />
                    </Button>
                  )}
                  {account && (
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      onPress={() => onCloseAccount(state.accountId)}
                      title="关闭"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Show open accounts without publish states */}
          {openAccounts
            .filter((a) => !publishStates.some((s) => s.accountId === a.accountId))
            .map((account) => (
              <div
                key={account.accountId}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <Terminal className="size-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{getAccountLabel(account)}</div>
                  <div className="text-xs text-muted-foreground">浏览器已打开</div>
                </div>
                <Chip size="sm" variant="flat">就绪</Chip>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onPress={() => handleViewDetail(account.accountId)}
                    title="查看详情"
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onPress={() => onCloseAccount(account.accountId)}
                    title="关闭"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  // Detail view - shows browser view for selected account
  const activeAccount = openAccounts.find((a) => a.accountId === activeAccountId)
  const activeState = activeAccountId ? getPublishState(activeAccountId) : undefined

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Toolbar */}
      <div className="h-12 bg-muted/30 border-b flex items-center px-3 gap-2">
        <Button size="sm" variant="light" onPress={handleBackToOverview}>
          <ArrowLeft className="size-4" />
          返回总览
        </Button>
        <div className="flex-1" />
        {activeAccount && (
          <>
            <span className="text-sm font-medium">{getAccountLabel(activeAccount)}</span>
            {activeState && <StatusChip status={activeState.status} message={activeState.message} />}
          </>
        )}
      </div>

      {/* Account tabs */}
      <div className="h-10 bg-muted/20 border-b flex items-center px-2 gap-1 overflow-x-auto">
        {openAccounts.map((account) => {
          const state = getPublishState(account.accountId)
          return (
            <div
              key={account.accountId}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer text-sm
                ${activeAccountId === account.accountId ? 'bg-background border' : 'hover:bg-muted/50'}
              `}
              onClick={() => onSwitchAccount(account.accountId)}
            >
              {state && <StatusIcon status={state.status} />}
              <span>{getAccountLabel(account)}</span>
              <button
                className="ml-1 p-0.5 hover:bg-muted rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseAccount(account.accountId)
                }}
              >
                <X className="size-3" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Browser view area - actual BrowserView is managed by main process */}
      <div className="flex-1 bg-muted/10">
        {/* BrowserView will be positioned here by the main process */}
      </div>
    </div>
  )
}
