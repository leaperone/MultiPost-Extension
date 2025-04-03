import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Settings } from 'lucide-react';
import { saveExtraConfig, getExtraConfig } from '~sync/extraconfig';

interface ZsxqGroup {
  group_id: number;
  name: string;
  type: string;
}

interface ZsxqApiResponse {
  succeeded: boolean;
  resp_data: {
    groups: ZsxqGroup[];
  };
}

interface ZsxqConfig {
  customInjectUrls: string[];
  selectedGroupIds: string[];
}

interface ZsxqProps {
  platformKey: string;
}

export default function DynamicZsxq({ platformKey }: ZsxqProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState<ZsxqGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [customInjectUrls, setCustomInjectUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await getExtraConfig<ZsxqConfig>(platformKey);
      if (config) {
        if (config.selectedGroupIds) {
          setSelectedGroupIds(config.selectedGroupIds);
        }
        if (config.customInjectUrls) {
          setCustomInjectUrls(config.customInjectUrls);
        }
      }
    };
    loadConfig();
  }, [platformKey]);

  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('https://api.zsxq.com/v2/groups');
        const data: ZsxqApiResponse = await response.json();
        if (data.succeeded) {
          setGroups(data.resp_data.groups);

          const apiGroupIds = new Set(data.resp_data.groups.map((g) => String(g.group_id)));
          const hasInvalidGroups = selectedGroupIds.some((id) => !apiGroupIds.has(id));

          if (hasInvalidGroups) {
            setSelectedGroupIds([]);
            setCustomInjectUrls([]);
            await saveExtraConfig<ZsxqConfig>(platformKey, {
              customInjectUrls: [],
              selectedGroupIds: [],
            });
          }
        } else {
          setSelectedGroupIds([]);
          setCustomInjectUrls([]);
          await saveExtraConfig<ZsxqConfig>(platformKey, {
            customInjectUrls: [],
            selectedGroupIds: [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch ZSXQ groups:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleSelectGroup = (groupId: number) => {
    setSelectedGroupIds((prev) => {
      const id = String(groupId);
      if (prev.includes(id)) {
        // 移除选中状态和对应的URL
        setCustomInjectUrls((urls) => urls.filter((url) => !url.includes(`/group/${id}`)));
        return prev.filter((g) => g !== id);
      }
      // 添加选中状态和对应的URL
      setCustomInjectUrls((urls) => [...urls, `https://wx.zsxq.com/group/${id}`]);
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    await saveExtraConfig<ZsxqConfig>(platformKey, {
      customInjectUrls,
      selectedGroupIds,
    });
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="light"
        size="sm"
        onPress={() => setIsOpen(true)}
        className="flex items-center gap-1">
        <Settings className="w-4 h-4" />
        {selectedGroupIds.length > 0
          ? `已选择 ${selectedGroupIds.length} 个星球`
          : chrome.i18n.getMessage('extraConfigZsxqSelectGroups')}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="md"
        placement="center"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>{chrome.i18n.getMessage('extraConfigZsxqConfigureGroups')}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-4 text-center">{chrome.i18n.getMessage('extraConfigZsxqLoading')}</div>
              ) : groups.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  {chrome.i18n.getMessage('extraConfigZsxqNoGroups')}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <Button
                      key={group.group_id}
                      variant={selectedGroupIds.includes(String(group.group_id)) ? 'solid' : 'light'}
                      color={selectedGroupIds.includes(String(group.group_id)) ? 'primary' : 'default'}
                      onPress={() => handleSelectGroup(group.group_id)}
                      className="flex-none">
                      {group.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsOpen(false)}>
              {chrome.i18n.getMessage('extraConfigZsxqCancel')}
            </Button>
            <Button
              variant="solid"
              onPress={handleSave}>
              {chrome.i18n.getMessage('extraConfigZsxqSaveConfig')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
