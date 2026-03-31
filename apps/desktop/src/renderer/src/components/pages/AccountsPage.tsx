import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Users, Star, LogIn, FolderPlus, Pencil } from 'lucide-react'
import { Button } from '@heroui/react'
import { Card, CardBody, CardHeader } from '@heroui/react'
import { Avatar } from '@heroui/react'
import { Chip } from '@heroui/react'
import { Tabs, Tab } from '@heroui/react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/react'
import { Input } from '@heroui/react'
import { Select, SelectItem } from '@heroui/react'
import { addToast } from '@heroui/react'
import { PLATFORMS } from '@shared/constants'
import type { Account, AccountGroup, PlatformType } from '@shared/types'
import { PlatformIcon } from '../publish/shared'

interface AccountsPageProps {
  onLoginAccount?: (account: Account) => void
}

export function AccountsPage({ onLoginAccount }: AccountsPageProps): React.ReactElement {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [groups, setGroups] = useState<AccountGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const { isOpen: isAddAccountOpen, onOpen: onAddAccountOpen, onClose: onAddAccountClose } = useDisclosure()
  const { isOpen: isAddGroupOpen, onOpen: onAddGroupOpen, onClose: onAddGroupClose } = useDisclosure()
  const { isOpen: isEditAccountOpen, onOpen: onEditAccountOpen, onClose: onEditAccountClose } = useDisclosure()

  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | ''>('')
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [accountsData, groupsData] = await Promise.all([
        window.api.account.list(selectedGroup ? { groupId: selectedGroup } : undefined),
        window.api.group.list()
      ])
      setAccounts(accountsData)
      setGroups(groupsData)
    } catch (error) {
      console.error('Failed to load accounts:', error)
      addToast({
        title: '加载失败',
        description: '无法加载账号列表',
        hideIcon: true
      })
    } finally {
      setLoading(false)
    }
  }, [selectedGroup])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAddAccount = async () => {
    if (!selectedPlatform) return

    try {
      const account = await window.api.account.create(selectedPlatform)
      setAccounts((prev) => [account, ...prev])
      onAddAccountClose()
      setSelectedPlatform('')
      addToast({
        title: '添加成功',
        description: `已添加 ${PLATFORMS[selectedPlatform]?.name || selectedPlatform} 账号`,
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to add account:', error)
      addToast({
        title: '添加失败',
        description: '无法添加账号',
        hideIcon: true
      })
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      await window.api.account.delete(id)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      addToast({
        title: '删除成功',
        description: '账号已删除',
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to delete account:', error)
      addToast({
        title: '删除失败',
        description: '无法删除账号',
        hideIcon: true
      })
    }
  }

  const handleSetDefault = async (account: Account) => {
    try {
      await window.api.account.setDefault(account.id, account.platform)
      await loadData()
      addToast({
        title: '设置成功',
        description: `已将 ${account.displayName || account.username} 设为默认账号`,
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to set default:', error)
    }
  }

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return

    try {
      const group = await window.api.group.create({
        name: newGroupName.trim(),
        color: newGroupColor || undefined
      })
      setGroups((prev) => [...prev, group])
      onAddGroupClose()
      setNewGroupName('')
      setNewGroupColor('')
      addToast({
        title: '创建成功',
        description: `分组 "${group.name}" 已创建`,
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to add group:', error)
      addToast({
        title: '创建失败',
        description: '无法创建分组',
        hideIcon: true
      })
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      await window.api.group.delete(id)
      setGroups((prev) => prev.filter((g) => g.id !== id))
      if (selectedGroup === id) {
        setSelectedGroup(null)
      }
      addToast({
        title: '删除成功',
        description: '分组已删除',
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }

  const handleAssignGroup = async (accountId: string, groupId: string | null) => {
    try {
      await window.api.account.update(accountId, { groupId: groupId || undefined })
      await loadData()
    } catch (error) {
      console.error('Failed to assign group:', error)
    }
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setEditDisplayName(account.displayName || account.username || '')
    onEditAccountOpen()
  }

  const handleSaveAccountName = async () => {
    if (!editingAccount) return

    try {
      await window.api.account.update(editingAccount.id, {
        displayName: editDisplayName.trim() || undefined
      })
      await loadData()
      onEditAccountClose()
      setEditingAccount(null)
      addToast({
        title: '保存成功',
        description: '账号名称已更新',
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to update account name:', error)
      addToast({
        title: '保存失败',
        description: '无法更新账号名称',
        hideIcon: true
      })
    }
  }

  const platformOptions = Object.entries(PLATFORMS).map(([key, value]) => ({
    key,
    label: value.name
  }))

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">账号管理</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="bordered" onPress={onAddGroupOpen}>
            <FolderPlus className="size-4" />
            新建分组
          </Button>
          <Button size="sm" color="primary" onPress={onAddAccountOpen}>
            <Plus className="size-4" />
            添加账号
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        支持自动检测登录状态的平台：微博、小红书、B站、知乎、Twitter。其他平台需要手动确认登录状态。
      </p>

      <Tabs
        selectedKey={selectedGroup || 'all'}
        onSelectionChange={(key) => setSelectedGroup(key === 'all' ? null : String(key))}
      >
        <Tab key="all" title="全部" />
        {groups.map((group) => (
          <Tab
            key={group.id}
            title={
              <div className="flex items-center gap-2">
                {group.color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                <span>{group.name}</span>
                <button
                  className="ml-1 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteGroup(group.id)
                  }}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            }
          />
        ))}
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <span className="text-muted-foreground">加载中...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-4">
          <Users className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">暂无账号</p>
          <Button size="sm" color="primary" onPress={onAddAccountOpen}>
            添加第一个账号
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className="shadow-none border">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar
                  src={account.avatar}
                  name={account.displayName || account.username}
                  size="lg"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      className="text-md font-semibold truncate hover:underline text-left"
                      onClick={() => handleEditAccount(account)}
                      title="点击编辑名称"
                    >
                      {account.displayName || account.username}
                    </button>
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      className="min-w-6 w-6 h-6"
                      onPress={() => handleEditAccount(account)}
                      title="编辑名称"
                    >
                      <Pencil className="size-3" />
                    </Button>
                    {account.isDefault && (
                      <Chip size="sm" color="warning" variant="flat" className="flex-shrink-0">
                        默认
                      </Chip>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-small text-muted-foreground">
                    <PlatformIcon platform={account.platform} size={16} />
                    <span>{PLATFORMS[account.platform]?.name || account.platform}</span>
                  </div>
                </div>
                <Chip
                  size="sm"
                  color={account.isLoggedIn ? 'success' : 'default'}
                  variant="flat"
                  className="flex-shrink-0"
                >
                  {account.isLoggedIn ? '已登录' : '未登录'}
                </Chip>
              </CardHeader>
              <CardBody className="pt-2">
                <div className="flex flex-row items-center gap-2">
                  <Button
                    size="sm"
                    variant="bordered"
                    color={account.isLoggedIn ? 'default' : 'primary'}
                    onPress={() => onLoginAccount?.(account)}
                    startContent={<LogIn className="size-4" />}
                  >
                    {account.isLoggedIn ? '重新登录' : '去登录'}
                  </Button>
                  <Select
                    size="sm"
                    placeholder="选择分组"
                    selectedKeys={account.groupId ? [account.groupId] : []}
                    onChange={(e) => handleAssignGroup(account.id, e.target.value || null)}
                    className="w-32"
                  >
                    {groups.map((g) => (
                      <SelectItem key={g.id}>{g.name}</SelectItem>
                    ))}
                  </Select>
                  <div className="flex-1" />
                  {!account.isDefault && (
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      onPress={() => handleSetDefault(account)}
                      title="设为默认"
                    >
                      <Star className="size-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    onPress={() => handleDeleteAccount(account.id)}
                    title="删除账号"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      <Modal isOpen={isAddAccountOpen} onClose={onAddAccountClose}>
        <ModalContent>
          <ModalHeader>添加账号</ModalHeader>
          <ModalBody>
            <Select
              label="选择平台"
              placeholder="请选择平台"
              selectedKeys={selectedPlatform ? [selectedPlatform] : []}
              onChange={(e) => setSelectedPlatform(e.target.value as PlatformType)}
            >
              {platformOptions.map((p) => (
                <SelectItem key={p.key}>{p.label}</SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onAddAccountClose}>
              取消
            </Button>
            <Button color="primary" onPress={handleAddAccount} isDisabled={!selectedPlatform}>
              添加
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Group Modal */}
      <Modal isOpen={isAddGroupOpen} onClose={onAddGroupClose}>
        <ModalContent>
          <ModalHeader>新建分组</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input
              label="分组名称"
              placeholder="输入分组名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Input
              type="color"
              label="分组颜色（可选）"
              value={newGroupColor}
              onChange={(e) => setNewGroupColor(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onAddGroupClose}>
              取消
            </Button>
            <Button color="primary" onPress={handleAddGroup} isDisabled={!newGroupName.trim()}>
              创建
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Account Modal */}
      <Modal isOpen={isEditAccountOpen} onClose={onEditAccountClose}>
        <ModalContent>
          <ModalHeader>编辑账号名称</ModalHeader>
          <ModalBody>
            <Input
              label="显示名称"
              placeholder="输入账号显示名称"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditAccountClose}>
              取消
            </Button>
            <Button color="primary" onPress={handleSaveAccountName}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
