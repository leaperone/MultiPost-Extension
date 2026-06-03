'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Spinner,
  Card,
  CardBody,
  DatePicker,
  Checkbox,
} from '@heroui/react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/client';
import PlatformCheckbox from '@/app/dashboard/publish/components/PlatformCheckbox';
import type { PlatformInfo } from '@/lib/extension';
import { CalendarDateTime, now, getLocalTimeZone } from '@internationalized/date';
import { useDraftStore } from '@/store/draft.store';
import { useMdDraftStore } from '@/store/md-draft.store';

interface Client {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientDetail extends Client {
  platformInfos: Array<{
    name: string;
    injectUrl?: string;
    extraConfig?: unknown;
  }>;
}

interface Platform extends PlatformInfo {
  selected: boolean;
}

interface ClientPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ClientPublishModal({
  isOpen,
  onClose,
  onSuccess,
}: ClientPublishModalProps) {
  const { t } = useTranslation('draft');
  const activeDraftId = useMdDraftStore((s) => s.activeDraftId);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingClientDetail, setIsLoadingClientDetail] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<CalendarDateTime | null>(null);

  const { clientId, selectedPlatforms, setClientId, setSelectedPlatforms } = useDraftStore();

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const response = await fetch('/api/extension/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const result = await response.json();
      if (result.success) {
        setClients(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error(t('publish.toast.fetchClientsFailed'));
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    if (newClientId) {
      fetchClientDetail(newClientId);
    } else {
      setClientDetail(null);
      setPlatforms([]);
    }
  };

  const handlePlatformToggle = (platformName: string, isSelected: boolean) => {
    setPlatforms((prev) => {
      const updated = prev.map((platform) =>
        platform.name === platformName ? { ...platform, selected: isSelected } : platform,
      );
      const selectedPlatformNames = updated.filter((p) => p.selected).map((p) => p.name);
      setSelectedPlatforms(selectedPlatformNames);
      return updated;
    });
  };

  const handlePlatformExtraConfigChange = (platformName: string, extraConfig: unknown) => {
    setPlatforms((prev) =>
      prev.map((platform) => (platform.name === platformName ? { ...platform, extraConfig } : platform)),
    );
  };

  const restorePlatformSelections = (platformList: Platform[]) => {
    return platformList.map((platform) => ({
      ...platform,
      selected: selectedPlatforms.includes(platform.name),
    }));
  };

  const fetchClientDetail = async (targetClientId: string) => {
    setIsLoadingClientDetail(true);
    try {
      const response = await fetch(`/api/extension/client?clientId=${targetClientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch client detail');
      }
      const result = await response.json();
      if (result.success) {
        setClientDetail(result.data);
        const platformsWithSelection = result.data.platformInfos
          .filter((platform: PlatformInfo) => platform.type === 'DYNAMIC')
          .map((platform: PlatformInfo) => ({
            ...platform,
            selected: false,
          }));
        const restoredPlatforms = restorePlatformSelections(platformsWithSelection);
        setPlatforms(restoredPlatforms);
      } else {
        throw new Error(result.message || 'Failed to fetch client detail');
      }
    } catch (error) {
      console.error('Error fetching client detail:', error);
      toast.error(t('publish.toast.fetchClientDetailFailed'));
    } finally {
      setIsLoadingClientDetail(false);
    }
  };

  const handlePublish = async () => {
    if (!clientId) {
      toast.error(t('publish.toast.selectClient'));
      return;
    }

    const selectedPlatformsData = platforms.filter((p) => p.selected);
    if (selectedPlatformsData.length === 0) {
      toast.error(t('publish.toast.selectPlatform'));
      return;
    }

    if (!activeDraftId) {
      toast.error(t('publish.toast.draftIdRequired'));
      return;
    }

    if (scheduleEnabled && !scheduledDateTime) {
      toast.error(t('publish.toast.selectDateTime'));
      return;
    }

    setIsPublishing(true);
    try {
      // Save draft before publishing to ensure latest content is persisted
      await useMdDraftStore.getState().saveDraft();

      let timestamp = Date.now();
      const taskType = 'DRAFT_POST';

      if (scheduleEnabled && scheduledDateTime) {
        const scheduledDate = new Date(
          scheduledDateTime.year,
          scheduledDateTime.month - 1,
          scheduledDateTime.day,
          scheduledDateTime.hour,
          scheduledDateTime.minute,
          scheduledDateTime.second,
        );
        timestamp = scheduledDate.getTime();

        if (timestamp <= Date.now()) {
          toast.error(t('publish.toast.futureTimeRequired'));
          setIsPublishing(false);
          return;
        }
      }

      const taskData = {
        draftId: activeDraftId,
        platforms: selectedPlatformsData.map((p) => ({
          name: p.name,
          injectUrl: p.injectUrl,
          extraConfig: p.extraConfig,
        })),
        timestamp,
      };

      const requestBody = {
        targetClientId: clientId,
        taskType,
        taskData,
      };

      const response = await fetch('/api/extension/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const result = await response.json();
      if (result.success) {
        const timeMessage =
          scheduleEnabled && scheduledDateTime
            ? t('publish.toast.publishScheduledSuccess', {
                time: `${scheduledDateTime.year}-${String(scheduledDateTime.month).padStart(2, '0')}-${String(scheduledDateTime.day).padStart(2, '0')} ${String(scheduledDateTime.hour).padStart(2, '0')}:${String(scheduledDateTime.minute).padStart(2, '0')}:${String(scheduledDateTime.second).padStart(2, '0')}`,
              })
            : t('publish.toast.publishSuccess');
        toast.success(timeMessage);
        onSuccess?.();
        onClose();
        setScheduleEnabled(false);
        setScheduledDateTime(null);
      } else {
        throw new Error(result.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating publish task:', error);
      toast.error(t('publish.toast.publishFailed'));
    } finally {
      setIsPublishing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && clientId && clients.length > 0) {
      const clientExists = clients.some((client) => client.id === clientId);
      if (clientExists) {
        fetchClientDetail(clientId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clients, clientId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">{t('publish.modal.title')}</ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{t('publish.client.label')}</span>
                <span className="text-xs text-default-500">
                  {t('publish.client.helpText')}{' '}
                  <a
                    href="/dashboard/settings/client"
                    className="text-primary-600 underline hover:text-primary-700"
                    target="_blank"
                    rel="noopener noreferrer">
                    {t('publish.client.helpLink')}
                  </a>
                </span>
              </div>
              <Select
                placeholder={t('publish.client.placeholder')}
                selectedKeys={clientId ? new Set([clientId]) : new Set()}
                onSelectionChange={(keys) => {
                  const selectedClientId = Array.from(keys)[0] as string;
                  handleClientChange(selectedClientId);
                }}
                isLoading={isLoadingClients}>
                {clients.map((client) => (
                  <SelectItem key={client.id}>{client.name}</SelectItem>
                ))}
              </Select>
            </div>

            {isLoadingClientDetail && (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            )}

            {clientDetail && platforms.length > 0 && (
              <div>
                <span className="mb-2 block text-sm font-medium">{t('publish.platform.label')}</span>
                <Card>
                  <CardBody>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {platforms.map((platform) => (
                        <PlatformCheckbox
                          key={platform.name}
                          platformInfo={platform}
                          isSelected={platform.selected}
                          onChange={(platformName, isSelected) =>
                            handlePlatformToggle(platformName as string, isSelected)
                          }
                          onExtraConfigChange={handlePlatformExtraConfigChange}
                        />
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            <div>
              <span className="mb-2 block text-sm font-medium">{t('publish.schedule.label')}</span>
              <div className="space-y-3">
                <Checkbox
                  isSelected={scheduleEnabled}
                  onValueChange={setScheduleEnabled}>
                  {t('publish.schedule.enableSchedule')}
                </Checkbox>

                {scheduleEnabled && (
                  <div className="space-y-3">
                    <DatePicker
                      label={t('publish.schedule.selectDateTime')}
                      value={scheduledDateTime as any}
                      onChange={setScheduledDateTime as any}
                      granularity="second"
                      minValue={now(getLocalTimeZone()) as any}
                      showMonthAndYearPickers
                      isRequired
                    />

                    {scheduledDateTime && (
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-sm text-blue-700">
                          {t('publish.schedule.scheduledTime')}: {scheduledDateTime.year}-
                          {String(scheduledDateTime.month).padStart(2, '0')}-
                          {String(scheduledDateTime.day).padStart(2, '0')}{' '}
                          {String(scheduledDateTime.hour).padStart(2, '0')}:
                          {String(scheduledDateTime.minute).padStart(2, '0')}:
                          {String(scheduledDateTime.second).padStart(2, '0')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {activeDraftId && (
              <div className="rounded-lg bg-default-50 p-3">
                <p className="text-sm text-default-600">
                  {t('publish.draft.info')}: <span className="font-mono text-xs">{activeDraftId}</span>
                </p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={onClose}>
            {t('publish.modal.cancel')}
          </Button>
          <Button
            color="primary"
            onPress={handlePublish}
            isLoading={isPublishing}
            isDisabled={!clientId || platforms.filter((p) => p.selected).length === 0 || !activeDraftId}>
            {t('publish.modal.publish')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
