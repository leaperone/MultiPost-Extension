import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Input } from '@heroui/react';
import { Plus, Settings } from 'lucide-react';
import { savePlatformExtraConfig } from '@/app/dashboard/publish/action';
import { PlatformInfo } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';

interface OkjikeConfig {
  selectedTopic: string;
  historyTopics: string[];
}

interface OkjikeProps {
  platformInfo: PlatformInfo;
  onExtraConfigChange: (platformKey: string, extraConfig: unknown) => void;
}

export default function DynamicOkjike({ platformInfo, onExtraConfigChange }: OkjikeProps) {
  const { t } = useTranslation('publish.extraConfig');
  const [isOpen, setIsOpen] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    const config = platformInfo.extraConfig as OkjikeConfig;
    if (config?.historyTopics?.length > 0) {
      setTopics(config.historyTopics);
    }
    if (config?.selectedTopic) {
      setSelectedTopic(config.selectedTopic);
    }
  }, [platformInfo.extraConfig]);

  const handleAddTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic === selectedTopic ? '' : topic);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTopic();
    }
  };

  const handleSave = async () => {
    await savePlatformExtraConfig<OkjikeConfig>(platformInfo.name, {
      selectedTopic,
      historyTopics: topics,
    });
    setIsOpen(false);
    onExtraConfigChange(platformInfo.name, { selectedTopic, historyTopics: topics });
  };

  return (
    <>
      <Button
        variant="light"
        size="sm"
        onPress={() => setIsOpen(true)}
        className="flex items-center gap-1">
        <Settings className="size-4" />
        {t('modal.config')}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="md"
        placement="center"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>{t('modal.config')}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t('okjike.inputPlaceholder')}
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button
                  variant="light"
                  onPress={handleAddTopic}
                  isDisabled={!newTopic.trim() || topics.includes(newTopic.trim())}
                  className="flex items-center gap-1">
                  <Plus className="size-4" />
                  {t('modal.add')}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Button
                    key={topic}
                    variant={topic === selectedTopic ? 'solid' : 'light'}
                    color={topic === selectedTopic ? 'primary' : 'default'}
                    onPress={() => handleSelectTopic(topic)}
                    className="flex-none">
                    {topic}
                  </Button>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsOpen(false)}>
              {t('modal.cancel')}
            </Button>
            <Button
              variant="solid"
              onPress={handleSave}>
              {t('modal.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
