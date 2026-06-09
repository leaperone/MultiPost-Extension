import { parseDate } from '@internationalized/date';
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
  useDisclosure,
} from '@heroui/react';
import { useRouter } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { TagInput } from '@/components/ui/tag-input';
import { useTranslation } from '../../../../i18n/client';

export function CreateActivityModal() {
  const router = useRouter();
  const { t } = useTranslation('admin');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [expiredAt, setExpiredAt] = useState<Date>();
  const [taskType, setTaskType] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [examples, setExamples] = useState<string[]>([]);

  const taskTypes = [
    { value: 'PUBLISH_POST', label: t('activity.create.task_types.publish_post') },
    { value: 'COMMENT_POST', label: t('activity.create.task_types.comment_post') },
  ] as const;

  const handleDateChange = (value: { toDate: (timezone: string) => Date } | null) => {
    setExpiredAt(value ? value.toDate('UTC') : undefined);
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        taskType,
        title: formData.get('title'),
        description: formData.get('description') || undefined,
        link: formData.get('link') || undefined,
        keywords,
        examples,
        expiredAt: expiredAt?.getTime(),
        reward: formData.get('reward') || '0',
      };

      if (!data.taskType || !data.title || !expiredAt) {
        throw new Error(t('activity.create.validation.required_fields'));
      }

      const response = await fetch('/api/promotion/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('activity.error.operation_failed'));
      }

      toast.success(t('activity.create.success.created'));
      await router.invalidate();
      onOpenChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('activity.error.operation_failed'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        color="primary"
        startContent={<PlusIcon className="size-4" />}
        onPress={onOpen}>
        {t('activity.create.button')}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        scrollBehavior="outside"
        size="xl">
        <ModalContent>
          {(onClose) => (
            <form onSubmit={onSubmit}>
              <ModalHeader className="flex flex-col gap-1">{t('activity.create.modal_title')}</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="taskType"
                      className="text-sm font-medium">
                      {t('activity.create.labels.activity_type')}
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
                      {t('activity.create.labels.activity_title')}
                    </label>
                    <Input
                      id="title"
                      name="title"
                      required
                      placeholder={t('activity.create.placeholders.title')}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="text-sm font-medium">
                      {t('activity.create.labels.activity_description')}
                    </label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder={t('activity.create.placeholders.description')}
                      rows={4}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="link"
                      className="text-sm font-medium">
                      {t('activity.create.labels.activity_link')}
                    </label>
                    <Input
                      id="link"
                      name="link"
                      type="url"
                      placeholder={t('activity.create.placeholders.link')}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="keywords"
                      className="text-sm font-medium">
                      {t('activity.create.labels.keywords')}
                    </label>
                    <TagInput
                      id="keywords"
                      value={keywords}
                      onChange={setKeywords}
                      placeholder={t('activity.create.placeholders.keywords')}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="examples"
                      className="text-sm font-medium">
                      {t('activity.create.labels.examples')}
                    </label>
                    <TagInput
                      id="examples"
                      value={examples}
                      onChange={setExamples}
                      placeholder={t('activity.create.placeholders.examples')}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reward"
                      className="text-sm font-medium">
                      {t('activity.create.labels.reward')}
                    </label>
                    <Input
                      id="reward"
                      name="reward"
                      type="number"
                      defaultValue="0"
                      placeholder={t('activity.create.placeholders.reward')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">{t('activity.create.labels.deadline')}</label>
                    <DatePicker
                      className="w-full"
                      onChange={handleDateChange as never}
                      minValue={parseDate(new Date().toISOString().split('T')[0]) as never}
                      label={t('activity.create.placeholders.deadline')}
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
                  {t('activity.create.buttons.cancel')}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  isLoading={isLoading}>
                  {t('activity.create.buttons.create')}
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
