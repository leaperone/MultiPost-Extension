import { useState } from 'react'
import { Button, Card, Spinner } from '@heroui/react'
import { Plus, RefreshCw, Trash2, CheckCircle, Circle } from 'lucide-react'
import type { Account, PlatformType } from '../../../shared/types'
import { PLATFORMS } from '../../../shared/constants'
import { AddAccountModal } from './AddAccountModal'

interface AccountListProps {
  accounts: Account[]
  loading: boolean
  selectedAccount: Account | null
  onSelect: (account: Account) => void
  onCreate: (platform: PlatformType) => Promise<Account>
  onDelete: (id: string) => Promise<void>
  onRefresh: () => Promise<void>
}

const PLATFORM_ICONS: Record<string, string> = {
  weibo: '微',
  xiaohongshu: '红',
  twitter: 'X',
  douyin: '抖',
  bilibili: 'B',
  zhihu: '知',
  wechat: '微'
}

export function AccountList({
  accounts,
  loading,
  selectedAccount,
  onSelect,
  onCreate,
  onDelete,
  onRefresh
}: AccountListProps): React.ReactElement {
  const [showAddModal, setShowAddModal] = useState(false)

  const handleAddAccount = async (platform: PlatformType) => {
    const account = await onCreate(platform)
    setShowAddModal(false)
    // Automatically select and open the new account
    onSelect(account)
  }

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('确定要删除这个账号吗？')) {
      await onDelete(id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold">账号管理</h2>
        <div className="flex gap-2">
          <Button color="default" variant="bordered" size="sm" onPress={onRefresh}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
          <Button color="primary" variant="solid" size="sm" onPress={() => setShowAddModal(true)}>
            <Plus className="size-4" />
            添加账号
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-base font-medium mb-2">还没有添加任何账号</h3>
          <p className="text-sm text-default-500 mb-5">点击"添加账号"开始添加你的社交媒体账号</p>
          <Button color="primary" variant="solid" onPress={() => setShowAddModal(true)}>
            <Plus className="size-4" />
            添加账号
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card
              key={account.id}
              isPressable
              onPress={() => onSelect(account)}
              className={`p-4 transition-all ${
                selectedAccount?.id === account.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-default-100 flex items-center justify-center text-xl">
                  {PLATFORM_ICONS[account.platform] || account.platform[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{account.username}</h3>
                  <p className="text-xs text-default-500">{getPlatformName(account.platform)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-default-200">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    account.isLoggedIn
                      ? 'bg-success/10 text-success'
                      : 'bg-default-100 text-default-500'
                  }`}
                >
                  {account.isLoggedIn ? (
                    <>
                      <CheckCircle className="size-3" />
                      已登录
                    </>
                  ) : (
                    <>
                      <Circle className="size-3" />
                      未登录
                    </>
                  )}
                </span>
                <Button
                  variant="light"
                  size="sm"
                  isIconOnly
                  onPress={(e) => handleDeleteClick(e as unknown as React.MouseEvent, account.id)}
                  className="text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddAccount}
        />
      )}
    </div>
  )
}

function getPlatformName(platform: PlatformType): string {
  return PLATFORMS[platform]?.name || platform
}
