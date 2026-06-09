import { parseDate, type DateValue } from '@internationalized/date';
import {
  Button,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { TagInput } from '@/components/ui/tag-input';
import type { ClientPromotionTask } from '../../../../actions/activity';

interface EditActivityModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: ClientPromotionTask;
}

const taskTypes = [
  { value: 'PUBLISH_POST', label: '发布帖子' },
  { value: 'COMMENT_POST', label: '评论帖子' },
] as const;

export function EditActivityModal({ isOpen, onOpenChange, initialData }: EditActivityModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [expiredAt, setExpiredAt] = useState<Date>(new Date(initialData.expiredAt));
  const [taskType, setTaskType] = useState<string>(initialData.taskType);
  const [keywords, setKeywords] = useState<string[]>(initialData.keywords);
  const [examples, setExamples] = useState<string[]>(initialData.examples);

  const handleDateChange = (value: DateValue | null) => {
    setExpiredAt(value ? new Date(value.toString()) : new Date(initialData.expiredAt));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        id: initialData.id,
        taskType,
        title: formData.get('title'),
        description: formData.get('description') || undefined,
        link: formData.get('link') || undefined,
        keywords,
        examples,
        expiredAt: expiredAt.getTime(),
        reward: formData.get('reward') || '0',
      };

      if (!data.taskType || !data.title) {
        throw new Error('请填写必填字段');
      }

      const response = await fetch(`/api/promotion/task?id=${initialData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '操作失败');
      }

      toast.success('活动已更新');
      await router.invalidate();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      scrollBehavior="outside"
      size="xl">
      <ModalContent>
        {(onClose) => (
          <form onSubmit={onSubmit}>
            <ModalHeader className="flex flex-col gap-1">编辑活动</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="taskType"
                    className="text-sm font-medium">
                    活动类型
                  </label>
                  <Select
                    id="taskType"
                    name="taskType"
                    selectedKeys={[taskType]}
                    onSelectionChange={(keys) => setTaskType(Array.from(keys)[0] as string)}
                    required>
                    {taskTypes.map((type) => (
                      <SelectItem key={type.value}>{type.label}</SelectItem>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="title"
                    className="text-sm font-medium">
                    活动标题
                  </label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={initialData.title}
                    required
                    placeholder="输入活动标题"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="text-sm font-medium">
                    活动描述
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={initialData.description || ''}
                    placeholder="输入活动描述"
                    rows={4}
                  />
                </div>

                <div>
                  <label
                    htmlFor="link"
                    className="text-sm font-medium">
                    活动链接
                  </label>
                  <Input
                    id="link"
                    name="link"
                    type="url"
                    defaultValue={initialData.link || ''}
                    placeholder="输入活动链接"
                  />
                </div>

                <div>
                  <label
                    htmlFor="keywords"
                    className="text-sm font-medium">
                    关键词
                  </label>
                  <TagInput
                    id="keywords"
                    value={keywords}
                    onChange={setKeywords}
                    placeholder="输入关键词，按回车或逗号添加"
                  />
                </div>

                <div>
                  <label
                    htmlFor="examples"
                    className="text-sm font-medium">
                    示例
                  </label>
                  <TagInput
                    id="examples"
                    value={examples}
                    onChange={setExamples}
                    placeholder="输入示例，按回车或逗号添加"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reward"
                    className="text-sm font-medium">
                    奖励
                  </label>
                  <Input
                    id="reward"
                    name="reward"
                    type="number"
                    defaultValue={initialData.reward.toString()}
                    placeholder="输入奖励 Credit"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">截止日期</label>
                  <DatePicker
                    className="w-full"
                    defaultValue={
                      parseDate(new Date(initialData.expiredAt).toISOString().split('T')[0]) as never
                    }
                    onChange={handleDateChange as never}
                    minValue={parseDate(new Date().toISOString().split('T')[0]) as never}
                    label="选择截止日期"
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                type="button"
                variant="light"
                onPress={onClose}
                disabled={isLoading}>
                取消
              </Button>
              <Button
                type="submit"
                color="primary"
                isLoading={isLoading}>
                保存修改
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
