import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Input } from '@heroui/react';
import { Plus, Settings } from 'lucide-react';
import { saveExtraConfig, getExtraConfig } from '~sync/extraconfig';

interface OkjikeConfig {
  selectedTopic: string;
  historyTopics: string[];
}

interface OkjikeProps {
  platformKey: string;
}

export default function DynamicOkjike({ platformKey }: OkjikeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    // 加载已保存的即刻圈子配置
    const loadConfig = async () => {
      const config = await getExtraConfig<OkjikeConfig>(platformKey);
      if (config) {
        if (config.historyTopics.length > 0) {
          setTopics(config.historyTopics);
        }
        if (config.selectedTopic) {
          setSelectedTopic(config.selectedTopic);
        }
      }
    };
    loadConfig();
  }, [platformKey]);

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
    await saveExtraConfig<OkjikeConfig>(platformKey, {
      selectedTopic,
      historyTopics: topics,
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
        {selectedTopic || '选择圈子'}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="md"
        placement="center"
        backdrop="blur">
        <ModalContent>
          <ModalHeader>配置即刻圈子</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="输入圈子名称"
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
                  <Plus className="w-4 h-4" />
                  添加
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
              取消
            </Button>
            <Button
              variant="solid"
              onPress={handleSave}>
              保存配置
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
