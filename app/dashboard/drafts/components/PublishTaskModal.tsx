'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Input,
  Select,
  SelectItem,
  Divider,
  Tooltip,
} from '@heroui/react';
import { addToast } from '@heroui/react';
import { CalendarDateTime, now, getLocalTimeZone, today } from '@internationalized/date';
import { getDynamicDraft } from '../actions';
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
 * TikTok Creator Info interface
 */
interface TikTokCreatorInfo {
  privacy_level_options: string[];
  interaction_settings: {
    allow_comment: boolean;
    allow_duet: boolean;
    allow_stitch: boolean;
  };
}

/**
 * TikTok Post Metadata interface
 */
interface TikTokPostMetadata {
  title: string;
  privacy_level: string;
  allow_comment: boolean;
  allow_duet: boolean;
  allow_stitch: boolean;
  commercialContentDisclosure: boolean;
  yourBrand: boolean;
  brandedContent: boolean;
}

const privacyLevelOptions = [
  { key: 'PUBLIC_TO_EVERYONE', label: 'Public - Everyone can see' },
  { key: 'MUTUAL_FOLLOW_FRIEND', label: 'Mutual follow friends' },
  { key: 'FOLLOWER_OF_CREATOR', label: 'Followers only' },
  { key: 'SELF_ONLY', label: 'Private - Only me' },
];

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

  // TikTok metadata states
  const [tiktokCreatorInfo, setTiktokCreatorInfo] = useState<TikTokCreatorInfo | null>(null);
  const [tiktokMetadata, setTiktokMetadata] = useState<Record<string, TikTokPostMetadata>>({});
  const [isLoadingTiktokInfo, setIsLoadingTiktokInfo] = useState(false);

  // Draft info state
  const [draftInfo, setDraftInfo] = useState<{ title: string; content: string } | null>(null);
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
   * Fetch draft information
   */
  const fetchDraftInfo = useCallback(async () => {
    if (!draftId) return;

    try {
      const result = await getDynamicDraft(draftId);
      if (result.success && result.data) {
        setDraftInfo({
          title: result.data.title || '',
          content: result.data.content || '',
        });
      }
    } catch (error) {
      console.error('Error fetching draft info:', error);
    }
  }, [draftId]);

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
   * Fetch TikTok creator info for the first TikTok account
   */
  const fetchTiktokCreatorInfo = useCallback(async () => {
    const tiktokAccount = socialMediaAccounts.find((account) => account.platform === 'tiktok');
    if (!tiktokAccount) return;

    setIsLoadingTiktokInfo(true);
    try {
      // TODO: Implement actual API call to get creator info
      // For now, using mock data
      const mockCreatorInfo: TikTokCreatorInfo = {
        privacy_level_options: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIEND', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'],
        interaction_settings: {
          allow_comment: true,
          allow_duet: true,
          allow_stitch: true,
        },
      };

      setTiktokCreatorInfo(mockCreatorInfo);

      // Initialize metadata for all TikTok accounts
      const newMetadata: Record<string, TikTokPostMetadata> = {};
      socialMediaAccounts
        .filter((account) => account.platform === 'tiktok')
        .forEach((account) => {
          newMetadata[account.id] = {
            title: draftInfo?.title || '', // Use draft title as default
            privacy_level: '',
            allow_comment: false,
            allow_duet: false,
            allow_stitch: false,
            commercialContentDisclosure: false,
            yourBrand: false,
            brandedContent: false,
          };
        });
      setTiktokMetadata(newMetadata);
    } catch (error) {
      console.error('Error fetching TikTok creator info:', error);
      addToast({
        title: 'Failed to fetch TikTok creator info',
        color: 'danger',
      });
    } finally {
      setIsLoadingTiktokInfo(false);
    }
  }, [socialMediaAccounts, draftInfo]);

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
   * Handle TikTok metadata updates
   */
  const handleTiktokMetadataUpdate = (accountId: string, field: keyof TikTokPostMetadata, value: string | boolean) => {
    console.log('Updating TikTok metadata:', { accountId, field, value });
    setTiktokMetadata((prev) => {
      const updatedMetadata = {
        ...prev[accountId],
        [field]: value,
      };

      // Check if branded content is being enabled and privacy is private
      if (field === 'brandedContent' && value === true && updatedMetadata.privacy_level === 'SELF_ONLY') {
        updatedMetadata.privacy_level = 'PUBLIC_TO_EVERYONE';
        // Show notification to user about the automatic change
        setTimeout(() => {
          addToast({
            title: 'Privacy level automatically changed to Public',
            description: 'Branded content visibility cannot be set to private',
            color: 'warning',
          });
        }, 100);
      }

      return {
        ...prev,
        [accountId]: updatedMetadata,
      };
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

    // Validate TikTok metadata for selected TikTok accounts
    const selectedTiktokAccounts = socialMediaAccounts.filter(
      (account) => selectedAccounts.has(account.id) && account.platform === 'tiktok',
    );

    for (const account of selectedTiktokAccounts) {
      const metadata = tiktokMetadata[account.id];
      if (!metadata) {
        addToast({
          title: `TikTok metadata is required for ${account.displayName || account.username}`,
          color: 'danger',
        });
        return;
      }

      if (!metadata.title.trim()) {
        addToast({
          title: `Title is required for ${account.displayName || account.username}`,
          color: 'danger',
        });
        return;
      }

      if (!metadata.privacy_level) {
        addToast({
          title: `Privacy level is required for ${account.displayName || account.username}`,
          color: 'danger',
        });
        return;
      }

      // Music usage consent is now implicit - users see the agreement text
      // No need to check for explicit consent checkbox

      // Validate commercial content disclosure
      if (metadata.commercialContentDisclosure && !metadata.yourBrand && !metadata.brandedContent) {
        addToast({
          title: `You need to indicate if your content promotes yourself, a third party, or both for ${account.displayName || account.username}`,
          color: 'danger',
        });
        return;
      }

      // Validate branded content privacy restrictions
      if (metadata.brandedContent && metadata.privacy_level === 'SELF_ONLY') {
        addToast({
          title: `Branded content visibility cannot be set to private for ${account.displayName || account.username}`,
          color: 'danger',
        });
        return;
      }
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

  // Fetch draft info when modal opens
  useEffect(() => {
    if (isOpen && draftId) {
      fetchDraftInfo();
    }
  }, [isOpen, draftId, fetchDraftInfo]);

  // Fetch social media accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSocialMediaAccounts();
    }
  }, [isOpen]);

  // Fetch TikTok creator info when TikTok accounts are available
  useEffect(() => {
    if (socialMediaAccounts.length > 0 && socialMediaAccounts.some((account) => account.platform === 'tiktok')) {
      fetchTiktokCreatorInfo();
    }
  }, [socialMediaAccounts, fetchTiktokCreatorInfo]);

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

  /**
   * Check if the draft is a photo post (not video)
   * For now, we'll assume all posts are photo posts unless specified otherwise
   * TODO: Implement proper media type detection based on draft content
   */
  const isPhotoPost = () => {
    // TODO: Implement actual media type detection
    // This should check the draft's media files to determine if it's photo or video
    return true; // For now, assume all posts are photo posts
  };

  /**
   * Get the appropriate label text based on commercial content selection
   */
  const getContentLabelText = (metadata: TikTokPostMetadata) => {
    if (metadata.yourBrand && metadata.brandedContent) {
      return "Your photo/video will be labeled as 'Paid partnership'";
    }
    if (metadata.brandedContent) {
      return "Your photo/video will be labeled as 'Paid partnership'";
    }
    if (metadata.yourBrand) {
      return "Your photo/video will be labeled as 'Promotional content'";
    }
    return '';
  };

  /**
   * Get the appropriate compliance declaration text based on commercial content selection
   */
  const getComplianceDeclarationText = (metadata: TikTokPostMetadata) => {
    if (!metadata.commercialContentDisclosure) {
      return "By posting, you agree to TikTok's Music Usage Confirmation.";
    }

    // If commercial content disclosure is enabled
    if (metadata.brandedContent || (metadata.yourBrand && metadata.brandedContent)) {
      return "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation.";
    }

    // If only "Your Brand" is checked
    if (metadata.yourBrand) {
      return "By posting, you agree to TikTok's Music Usage Confirmation.";
    }

    // Default case
    return "By posting, you agree to TikTok's Music Usage Confirmation.";
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

            {/* TikTok Metadata Section */}
            {selectedAccounts.size > 0 &&
              socialMediaAccounts.some(
                (account) => selectedAccounts.has(account.id) && account.platform === 'tiktok',
              ) && (
                <div>
                  <Divider className="my-4" />
                  <h3 className="mb-4 text-lg font-semibold">TikTok Publishing Settings</h3>

                  {isLoadingTiktokInfo && (
                    <div className="flex justify-center py-4">
                      <Spinner size="sm" />
                      <span className="ml-2 text-sm text-default-500">Loading TikTok settings...</span>
                    </div>
                  )}

                  {tiktokCreatorInfo && (
                    <div className="space-y-4">
                      {socialMediaAccounts
                        .filter((account) => selectedAccounts.has(account.id) && account.platform === 'tiktok')
                        .map((account) => {
                          const metadata = tiktokMetadata[account.id];
                          if (!metadata) return null;

                          return (
                            <Card key={account.id}>
                              <CardBody>
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3">
                                    {account.avatarUrl && (
                                      <Image
                                        src={account.avatarUrl}
                                        alt={account.displayName || account.username || 'Account'}
                                        className="size-8 rounded-full"
                                        radius="full"
                                      />
                                    )}
                                    <div>
                                      <div className="font-medium">{getPlatformDisplayName(account.platform)}</div>
                                      <div className="text-sm text-default-600">
                                        {account.displayName || account.username || account.platformId}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Title Input */}
                                  <div>
                                    <Input
                                      label="Title"
                                      placeholder="Enter post title"
                                      value={metadata.title}
                                      onChange={(e) => handleTiktokMetadataUpdate(account.id, 'title', e.target.value)}
                                      isRequired
                                    />
                                  </div>

                                  {/* Privacy Level Selection */}
                                  <div>
                                    <Tooltip
                                      content="Branded content visibility cannot be set to private"
                                      isDisabled={!metadata.brandedContent}
                                      placement="top">
                                      <div>
                                        <Select
                                          label="Privacy Level"
                                          placeholder="Select a privacy level"
                                          selectedKeys={metadata.privacy_level ? [metadata.privacy_level] : []}
                                          onSelectionChange={(keys) => {
                                            const selectedKey = Array.from(keys)[0] as string;
                                            handleTiktokMetadataUpdate(account.id, 'privacy_level', selectedKey);
                                          }}>
                                          {privacyLevelOptions.map((option) => {
                                            const isDisabled = metadata.brandedContent && option.key === 'SELF_ONLY';
                                            return (
                                              <SelectItem
                                                key={option.key}
                                                isDisabled={isDisabled}
                                                textValue={option.label}>
                                                <div className="flex w-full items-center justify-between">
                                                  <span>{option.label}</span>
                                                  {isDisabled && (
                                                    <span className="ml-2 text-xs text-gray-400">
                                                      (Not available for branded content)
                                                    </span>
                                                  )}
                                                </div>
                                              </SelectItem>
                                            );
                                          })}
                                        </Select>
                                        {metadata.brandedContent && (
                                          <p className="mt-1 text-xs text-blue-600">
                                            Branded content visibility cannot be set to private
                                          </p>
                                        )}
                                      </div>
                                    </Tooltip>
                                  </div>

                                  {/* Interaction Settings */}
                                  <div>
                                    <label className="mb-2 block text-sm font-medium">Interaction Settings</label>
                                    <div className="space-y-2">
                                      <Checkbox
                                        isSelected={metadata.allow_comment}
                                        onValueChange={(checked) =>
                                          handleTiktokMetadataUpdate(account.id, 'allow_comment', checked)
                                        }
                                        isDisabled={!tiktokCreatorInfo.interaction_settings.allow_comment}>
                                        Allow Comments
                                      </Checkbox>

                                      {/* Duet and Stitch are only available for video posts */}
                                      {!isPhotoPost() && (
                                        <>
                                          <Checkbox
                                            isSelected={metadata.allow_duet}
                                            onValueChange={(checked) =>
                                              handleTiktokMetadataUpdate(account.id, 'allow_duet', checked)
                                            }
                                            isDisabled={!tiktokCreatorInfo.interaction_settings.allow_duet}>
                                            Allow Duet
                                          </Checkbox>
                                          <Checkbox
                                            isSelected={metadata.allow_stitch}
                                            onValueChange={(checked) =>
                                              handleTiktokMetadataUpdate(account.id, 'allow_stitch', checked)
                                            }
                                            isDisabled={!tiktokCreatorInfo.interaction_settings.allow_stitch}>
                                            Allow Stitch
                                          </Checkbox>
                                        </>
                                      )}

                                      {/* Show info message for photo posts */}
                                      {isPhotoPost() && (
                                        <div className="rounded-lg bg-blue-50 p-3">
                                          <p className="text-sm text-blue-700">
                                            Duet and Stitch features are only available for video posts. Photo posts
                                            only support comments.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Commercial Content Disclosure */}
                                  <div>
                                    <div className="mb-3 flex items-center justify-between">
                                      <label className="text-sm font-medium">Disclose video content</label>
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={metadata.commercialContentDisclosure}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            handleTiktokMetadataUpdate(
                                              account.id,
                                              'commercialContentDisclosure',
                                              checked,
                                            );
                                            // Reset brand options when toggling off
                                            if (!checked) {
                                              handleTiktokMetadataUpdate(account.id, 'yourBrand', false);
                                              handleTiktokMetadataUpdate(account.id, 'brandedContent', false);
                                            }
                                          }}
                                          className="sr-only"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newValue = !metadata.commercialContentDisclosure;
                                            handleTiktokMetadataUpdate(
                                              account.id,
                                              'commercialContentDisclosure',
                                              newValue,
                                            );
                                            if (!newValue) {
                                              handleTiktokMetadataUpdate(account.id, 'yourBrand', false);
                                              handleTiktokMetadataUpdate(account.id, 'brandedContent', false);
                                            }
                                          }}
                                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                            metadata.commercialContentDisclosure ? 'bg-blue-600' : 'bg-gray-200'
                                          }`}>
                                          <span
                                            className={`inline-block size-4 rounded-full bg-white transition-transform ${
                                              metadata.commercialContentDisclosure ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                          />
                                        </button>
                                      </div>
                                    </div>

                                    <p className="mb-4 text-sm text-gray-600">
                                      Turn on to disclose that this video promotes goods or services in exchange for
                                      something of value. Your video could promote yourself, a third party, or both.
                                    </p>

                                    {metadata.commercialContentDisclosure && (
                                      <div className="space-y-4">
                                        {/* Content Label Information */}
                                        {getContentLabelText(metadata) && (
                                          <div className="flex items-start space-x-3 rounded-lg bg-blue-50 p-3">
                                            <div className="shrink-0">
                                              <svg
                                                className="size-5 text-blue-600"
                                                fill="currentColor"
                                                viewBox="0 0 20 20">
                                                <path
                                                  fillRule="evenodd"
                                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                            </div>
                                            <p className="text-sm text-blue-700">
                                              {getContentLabelText(metadata)} This cannot be changed once your video is
                                              posted.
                                            </p>
                                          </div>
                                        )}

                                        <div className="space-y-3">
                                          <Checkbox
                                            isSelected={metadata.yourBrand}
                                            onValueChange={(checked) =>
                                              handleTiktokMetadataUpdate(account.id, 'yourBrand', checked)
                                            }>
                                            <div>
                                              <div className="font-medium">Your brand</div>
                                              <div className="text-sm text-gray-600">
                                                You are promoting yourself or your own business. This video will be
                                                classified as Brand Organic.
                                              </div>
                                            </div>
                                          </Checkbox>
                                          <Checkbox
                                            isSelected={metadata.brandedContent}
                                            onValueChange={(checked) => {
                                              handleTiktokMetadataUpdate(account.id, 'brandedContent', checked);
                                            }}>
                                            <div>
                                              <div className="font-medium">Branded content</div>
                                              <div className="text-sm text-gray-600">
                                                You are promoting another brand or a third party. This video will be
                                                classified as Branded Content.
                                              </div>
                                            </div>
                                          </Checkbox>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Music Usage Consent */}
                                  <div className="mt-4">
                                    <p className="text-sm text-gray-700">
                                      {getComplianceDeclarationText(metadata).includes('Branded Content Policy') ? (
                                        <>
                                          By posting, you agree to TikTok&apos;s{' '}
                                          <a
                                            href="https://www.tiktok.com/legal/page/global/branded-content-policy/en"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 underline hover:text-blue-800">
                                            Branded Content Policy
                                          </a>{' '}
                                          and{' '}
                                          <a
                                            href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 underline hover:text-blue-800">
                                            Music Usage Confirmation
                                          </a>
                                          .
                                        </>
                                      ) : (
                                        <>
                                          By posting, you agree to TikTok&apos;s{' '}
                                          <a
                                            href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 underline hover:text-blue-800">
                                            Music Usage Confirmation
                                          </a>
                                          .
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </CardBody>
                            </Card>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

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
