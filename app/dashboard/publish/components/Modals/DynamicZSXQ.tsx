import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, addToast } from '@heroui/react';
import { Plus, Settings, Trash2, Link, AlertCircle } from 'lucide-react';
import { savePlatformExtraConfig } from '@/app/dashboard/publish/action';
import { PlatformInfo } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';

interface ZsxqGroup {
  id: string;
  name: string;
  url: string;
}

interface ZsxqConfig {
  groups: ZsxqGroup[];
  selectedGroupIds: string[];
  customInjectUrls: string[];
}

interface ZsxqProps {
  platformInfo: PlatformInfo;
  onExtraConfigChange: (platformKey: string, extraConfig: unknown) => void;
}

export default function DynamicZsxq({ platformInfo, onExtraConfigChange }: ZsxqProps) {
  const { t } = useTranslation('publish.extraConfig');
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState<ZsxqGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [customInjectUrls, setCustomInjectUrls] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupUrl, setNewGroupUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputError, setInputError] = useState<{
    name?: string;
    url?: string;
  }>({});

  useEffect(() => {
    const config = platformInfo.extraConfig;
    if (config) {
      if (config.groups) {
        setGroups(config.groups);
      }
      if (config.selectedGroupIds) {
        setSelectedGroupIds(config.selectedGroupIds);
      }
      if (config.customInjectUrls) {
        setCustomInjectUrls(config.customInjectUrls);
      }
    }
  }, [platformInfo.extraConfig]);

  const validateInput = () => {
    const errors: typeof inputError = {};

    if (!newGroupName.trim()) {
      errors.name = t('zsxq.modal.groupName.error');
    }

    if (!newGroupUrl.trim()) {
      errors.url = t('zsxq.modal.groupUrl.error');
    } else if (!newGroupUrl.includes('wx.zsxq.com/group/')) {
      errors.url = t('zsxq.modal.groupUrl.error');
    }

    setInputError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddGroup = () => {
    if (!validateInput()) return;

    const id = newGroupUrl.split('/group/')[1];
    const newGroup: ZsxqGroup = {
      id,
      name: newGroupName.trim(),
      url: newGroupUrl.trim(),
    };

    setGroups((prev) => [...prev, newGroup]);
    setNewGroupName('');
    setNewGroupUrl('');
    setInputError({});

    addToast({
      title: t('zsxq.toast.addSuccess.title'),
      description: t('zsxq.toast.addSuccess.description', { name: newGroupName }),
      color: 'success',
    });
  };

  const handleRemoveGroup = (id: string) => {
    setGroups((prev) => prev.filter((group) => group.id !== id));
    setSelectedGroupIds((prev) => prev.filter((groupId) => groupId !== id));
    setCustomInjectUrls((prev) => prev.filter((url) => !url.includes(`/group/${id}`)));
  };

  const handleToggleGroup = (group: ZsxqGroup) => {
    setSelectedGroupIds((prev) => {
      if (prev.includes(group.id)) {
        setCustomInjectUrls((urls) => urls.filter((url) => !url.includes(`/group/${group.id}`)));
        return prev.filter((id) => id !== group.id);
      } else {
        setCustomInjectUrls((urls) => {
          // 检查 URL 是否已经存在
          if (urls.includes(group.url)) {
            return urls;
          }
          return [...urls, group.url];
        });
        return [...prev, group.id];
      }
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await savePlatformExtraConfig<ZsxqConfig>(platformInfo.name, {
        groups,
        selectedGroupIds,
        customInjectUrls,
      });
      setIsOpen(false);
      onExtraConfigChange(platformInfo.name, { groups, selectedGroupIds, customInjectUrls });
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="light"
        size="sm"
        onPress={() => setIsOpen(true)}
        className="flex items-center gap-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
        <Settings className="size-4" />
        {selectedGroupIds.length > 0
          ? t('zsxq.button.selected', { count: selectedGroupIds.length })
          : t('zsxq.button.default')}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="md"
        placement="center"
        backdrop="blur">
        <ModalContent>
          <ModalHeader className="border-b">{t('zsxq.modal.title')}</ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              <div className="space-y-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <div className="space-y-2">
                  <Input
                    label={t('zsxq.modal.groupName.label')}
                    placeholder={t('zsxq.modal.groupName.placeholder')}
                    value={newGroupName}
                    onChange={(e) => {
                      setNewGroupName(e.target.value);
                      setInputError((prev) => ({ ...prev, name: undefined }));
                    }}
                    color={inputError.name ? 'danger' : 'default'}
                    errorMessage={inputError.name}
                    startContent={<AlertCircle className="size-4 text-gray-400" />}
                  />
                  <Input
                    label={t('zsxq.modal.groupUrl.label')}
                    placeholder={t('zsxq.modal.groupUrl.placeholder')}
                    value={newGroupUrl}
                    onChange={(e) => {
                      setNewGroupUrl(e.target.value);
                      setInputError((prev) => ({ ...prev, url: undefined }));
                    }}
                    color={inputError.url ? 'danger' : 'default'}
                    errorMessage={inputError.url}
                    startContent={<Link className="size-4 text-gray-400" />}
                  />
                </div>
                <Button
                  className="w-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  variant="solid"
                  startContent={<Plus className="size-4" />}
                  onPress={handleAddGroup}>
                  {t('zsxq.modal.addButton')}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-500">{t('zsxq.modal.addedGroups')}</div>
                <div className="max-h-[300px] space-y-2 overflow-y-auto">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-primary-200">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{group.name}</div>
                        <div className="truncate text-sm text-gray-500">{group.url}</div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={selectedGroupIds.includes(group.id) ? 'solid' : 'light'}
                          color={selectedGroupIds.includes(group.id) ? 'primary' : 'default'}
                          className="min-w-[80px] transition-all"
                          onPress={() => handleToggleGroup(group)}>
                          {selectedGroupIds.includes(group.id) ? t('zsxq.modal.selected') : t('zsxq.modal.select')}
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          onPress={() => handleRemoveGroup(group.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <div className="py-8 text-center text-gray-500">{t('zsxq.modal.noGroups')}</div>
                  )}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="border-t">
            <Button
              variant="light"
              onPress={() => setIsOpen(false)}>
              {t('modal.cancel')}
            </Button>
            <Button
              variant="solid"
              onPress={handleSave}
              isLoading={isLoading}>
              {t('modal.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
