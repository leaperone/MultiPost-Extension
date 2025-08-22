'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Card,
  CardBody,
  DatePicker,
  Checkbox,
  Image,
} from '@heroui/react';
import { addToast } from '@heroui/react';
import { CalendarDateTime, now, getLocalTimeZone, today } from '@internationalized/date';
import { getSocialMediaAccounts } from '@/actions/social-media-accounts';
import { createPublishTask } from '@/actions/publish-task';

/**
 * Social Media Account interface
 */
interface SocialMediaAccount {
  id: string;
  platform: string;
  platformId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

/**
 * Component props interface
 */
interface PublishTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId?: string;
  onSuccess?: () => void;
}

/**
 * PublishTask modal component for creating scheduled publish tasks
 */
export default function PublishTaskModal({ isOpen, onClose, draftId, onSuccess }: PublishTaskModalProps) {
  const [socialMediaAccounts, setSocialMediaAccounts] = useState<SocialMediaAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  // Set default publish time to current time if today, otherwise 12:00 PM
  const getDefaultPublishTime = (): CalendarDateTime => {
    const nowDateTime = now(getLocalTimeZone());
    const todayDate = today(getLocalTimeZone());

    // If it's today, use current time + 5 minutes
    if (
      nowDateTime.year === todayDate.year &&
      nowDateTime.month === todayDate.month &&
      nowDateTime.day === todayDate.day
    ) {
      // Add 5 minutes to current time
      let newHour = nowDateTime.hour;
      let newMinute = nowDateTime.minute + 5;

      // Handle minute overflow
      if (newMinute >= 60) {
        newMinute = newMinute - 60;
        newHour = newHour + 1;
      }

      // Handle hour overflow
      if (newHour >= 24) {
        newHour = 0;
      }

      return new CalendarDateTime(nowDateTime.year, nowDateTime.month, nowDateTime.day, newHour, newMinute);
    }

    // Otherwise use 12:00 PM
    return new CalendarDateTime(
      todayDate.year,
      todayDate.month,
      todayDate.day,
      12, // 12 PM
      0, // 0 minutes
    );
  };

  const [publishedAt, setPublishedAt] = useState<CalendarDateTime | null>(getDefaultPublishTime());

  /**
   * Fetch available social media accounts from server actions
   */
  const fetchSocialMediaAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const result = await getSocialMediaAccounts();
      if (result.success) {
        setSocialMediaAccounts(result.data?.filter((account: SocialMediaAccount) => account.isActive) || []);
      } else {
        throw new Error(result.error || 'Failed to fetch social media accounts');
      }
    } catch (error) {
      console.error('Error fetching social media accounts:', error);
      addToast({
        title: 'Failed to fetch social media accounts',
        color: 'danger',
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  /**
   * Handle account selection toggle
   */
  const handleAccountToggle = (accountId: string, isSelected: boolean) => {
    setSelectedAccounts((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(accountId);
      } else {
        newSet.delete(accountId);
      }
      return newSet;
    });
  };

  /**
   * Create publish task and associated logs using server actions
   */
  const handleCreatePublishTask = async () => {
    if (!draftId) {
      addToast({
        title: 'Draft ID is required',
        color: 'danger',
      });
      return;
    }

    if (selectedAccounts.size === 0) {
      addToast({
        title: 'Please select at least one social media account',
        color: 'danger',
      });
      return;
    }

    if (!publishedAt) {
      addToast({
        title: 'Please select a publish time',
        color: 'danger',
      });
      return;
    }

    // Check if scheduled time is in the future
    const scheduledDate = new Date(
      publishedAt.year,
      publishedAt.month - 1,
      publishedAt.day,
      publishedAt.hour,
      publishedAt.minute,
      publishedAt.second,
    );

    if (scheduledDate.getTime() <= Date.now()) {
      addToast({
        title: 'Publish time must be in the future',
        color: 'danger',
      });
      return;
    }

    setIsCreating(true);
    try {
      const selectedAccountIds = Array.from(selectedAccounts);

      const result = await createPublishTask({
        draftId,
        publishedAt: scheduledDate.toISOString(),
        selectedAccountIds,
      });

      if (result.success) {
        addToast({
          title: `Publish task created successfully for ${selectedAccountIds.length} platform(s)`,
          color: 'success',
        });
        onSuccess?.();
        onClose();
        // Reset form
        setSelectedAccounts(new Set());
        setPublishedAt(getDefaultPublishTime());
      } else {
        throw new Error(result.error || 'Failed to create publish task');
      }
    } catch (error) {
      console.error('Error creating publish task:', error);
      addToast({
        title: 'Failed to create publish task',
        color: 'danger',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Fetch social media accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSocialMediaAccounts();
    }
  }, [isOpen]);

  const getPlatformDisplayName = (platform: string) => {
    const platformNames: Record<string, string> = {
      twitter: 'Twitter/X',
      facebook: 'Facebook',
      instagram: 'Instagram',
      linkedin: 'LinkedIn',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      pinterest: 'Pinterest',
    };
    return platformNames[platform] || platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">Create Publish Task</ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            {/* Social Media Accounts Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium">Select Social Media Accounts</label>

              {isLoadingAccounts && (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                  <span className="ml-2 text-sm text-default-500">Loading accounts...</span>
                </div>
              )}

              {!isLoadingAccounts && socialMediaAccounts.length > 0 && (
                <Card>
                  <CardBody>
                    <div className="space-y-3">
                      {socialMediaAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {account.avatarUrl && (
                              <Image
                                src={account.avatarUrl || ''}
                                alt={account.displayName || account.username || 'Account'}
                                className="size-8 rounded-full"
                                radius="full"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getPlatformDisplayName(account.platform)}</span>
                                <span className="rounded bg-default-100 px-2 py-1 text-xs text-default-500">
                                  {account.platform}
                                </span>
                              </div>
                              <div className="text-sm text-default-600">
                                {account.displayName || account.username || account.platformId || 'Unknown'}
                              </div>
                            </div>
                          </div>
                          <Checkbox
                            isSelected={selectedAccounts.has(account.id)}
                            onValueChange={(isSelected) => handleAccountToggle(account.id, isSelected)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              {!isLoadingAccounts && socialMediaAccounts.length === 0 && (
                <Card>
                  <CardBody>
                    <div className="py-4 text-center">
                      <p className="text-default-500">No active social media accounts found</p>
                      <p className="mt-1 text-sm text-default-400">
                        Please add and activate social media accounts in Settings
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* Publish Time Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium">Schedule Publish Time</label>
              <DatePicker
                label="Select publish date and time"
                value={publishedAt}
                onChange={setPublishedAt}
                granularity="minute"
                minValue={now(getLocalTimeZone())}
                showMonthAndYearPickers
                hourCycle={24}
                isRequired
              />

              {publishedAt && (
                <div className="mt-3 rounded-lg bg-blue-50 p-3">
                  <p className="text-sm text-blue-700">
                    Scheduled for: {publishedAt.year}-{String(publishedAt.month).padStart(2, '0')}-
                    {String(publishedAt.day).padStart(2, '0')} {String(publishedAt.hour).padStart(2, '0')}:
                    {String(publishedAt.minute).padStart(2, '0')}
                  </p>
                </div>
              )}
            </div>

            {/* Draft Info */}
            {draftId && (
              <div className="rounded-lg bg-default-50 p-3">
                <p className="text-sm text-default-600">
                  Draft ID: <span className="font-mono text-xs">{draftId}</span>
                </p>
              </div>
            )}

            {/* Selected Accounts Summary */}
            {selectedAccounts.size > 0 && (
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-sm text-green-700">{selectedAccounts.size} account(s) selected for publishing</p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleCreatePublishTask}
            isLoading={isCreating}
            isDisabled={!draftId || selectedAccounts.size === 0 || !publishedAt}>
            Create Publish Task
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
