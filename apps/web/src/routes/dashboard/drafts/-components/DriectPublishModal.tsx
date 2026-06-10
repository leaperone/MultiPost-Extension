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
  Alert,
  Switch,
} from '@heroui/react';
import { toast } from 'sonner';
import { useTranslation } from '@/src/i18n/client';
import PlatformCheckbox from '../../publish/-components/PlatformCheckbox';
import {
  checkServiceStatus,
  getPlatformInfos,
  funcPublish,
  type PlatformInfo,
  type SyncData,
  type DynamicData,
} from '@/lib/extension';
import { useDraftStore } from '@/store/draft.store';

/**
 * Platform interface for form handling
 */
interface Platform extends PlatformInfo {
  selected: boolean;
}

/**
 * Component props interface
 */
interface DirectPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId?: string;
  draftData?: {
    title: string;
    content: string;
    images?: Array<{
      id?: string;
      name: string;
      url: string;
      type: string;
      size: number;
      originUrl?: string;
    }>;
    videos?: Array<{
      id?: string;
      name: string;
      url: string;
      type: string;
      size: number;
      originUrl?: string;
    }>;
  };
  onSuccess?: () => void;
}

/**
 * Direct publish modal component for publishing directly through extension
 */
export default function DirectPublishModal({
  isOpen,
  onClose,
  draftId,
  draftData,
  onSuccess,
}: DirectPublishModalProps) {
  const { t } = useTranslation('draft');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [isCheckingService, setIsCheckingService] = useState(false);

  // Use draft store for persistence
  const { directSelectedPlatforms, isAutoPublish, setDirectSelectedPlatforms, setIsAutoPublish } = useDraftStore();

  /**
   * Check if extension service is available
   */
  const checkExtensionService = async () => {
    setIsCheckingService(true);
    try {
      const isAvailable = await checkServiceStatus(5000);
      setServiceAvailable(isAvailable);
      return isAvailable;
    } catch (error) {
      console.error('Error checking extension service:', error);
      setServiceAvailable(false);
      return false;
    } finally {
      setIsCheckingService(false);
    }
  };

  /**
   * Restore platform selections from store
   */
  const restorePlatformSelections = (platformList: Platform[]) => {
    return platformList.map((platform) => ({
      ...platform,
      selected: directSelectedPlatforms.includes(platform.name),
    }));
  };

  /**
   * Fetch available platforms from extension
   */
  const fetchPlatforms = async () => {
    setIsLoadingPlatforms(true);
    try {
      const platformList = await getPlatformInfos('DYNAMIC');
      const platformsWithSelection = platformList.map((platform) => ({
        ...platform,
        selected: false,
      }));

      // Restore previous selections from store
      const restoredPlatforms = restorePlatformSelections(platformsWithSelection);
      setPlatforms(restoredPlatforms);
    } catch (error) {
      console.error('Error fetching platforms:', error);
      toast.error(t('publish.toast.fetchPlatformsFailed'));
    } finally {
      setIsLoadingPlatforms(false);
    }
  };

  /**
   * Handle platform selection toggle
   */
  const handlePlatformToggle = (platformName: string, isSelected: boolean) => {
    setPlatforms((prev) => {
      const updated = prev.map((platform) =>
        platform.name === platformName ? { ...platform, selected: isSelected } : platform,
      );

      // Update store with selected platforms
      const selectedPlatformNames = updated.filter((p) => p.selected).map((p) => p.name);
      setDirectSelectedPlatforms(selectedPlatformNames);

      return updated;
    });
  };

  /**
   * Handle platform extra config change
   */
  const handlePlatformExtraConfigChange = (platformName: string, extraConfig: unknown) => {
    setPlatforms((prev) =>
      prev.map((platform) => (platform.name === platformName ? { ...platform, extraConfig } : platform)),
    );
  };

  /**
   * Navigate to extension page
   */
  const handleGoToExtension = () => {
    window.location.href = '/extension';
    onClose();
  };

  /**
   * Submit publish task directly through extension
   */
  const handlePublish = async () => {
    if (!draftData) {
      toast.error(t('publish.toast.draftDataRequired'));
      return;
    }

    const selectedPlatformsData = platforms.filter((p) => p.selected);
    if (selectedPlatformsData.length === 0) {
      toast.error(t('publish.toast.selectPlatform'));
      return;
    }

    setIsPublishing(true);
    try {
      // Prepare data for extension
      const dynamicData: DynamicData = {
        title: draftData.title,
        content: draftData.content,
        images: draftData.images || [],
        videos: draftData.videos || [],
      };

      const syncData: SyncData = {
        platforms: selectedPlatformsData.map((p) => ({
          ...p,
          extraConfig: p.extraConfig,
        })),
        isAutoPublish,
        data: dynamicData,
      };

      // Publish through extension
      await funcPublish(syncData);

      toast.success(t('publish.toast.publishSuccess'));
      onSuccess?.();
      onClose();

      // Reset form
      setPlatforms((prev) => prev.map((p) => ({ ...p, selected: false })));
    } catch (error) {
      console.error('Error publishing through extension:', error);
      toast.error(t('publish.toast.publishFailed'));
    } finally {
      setIsPublishing(false);
    }
  };

  /**
   * Initialize when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      checkExtensionService().then((isAvailable) => {
        if (isAvailable) {
          fetchPlatforms();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">{t('publish.modal.directPublishTitle')}</ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            {/* Service Status Check */}
            {isCheckingService && (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
                <span className="ml-2 text-sm text-default-500">{t('publish.extension.checkingService')}</span>
              </div>
            )}

            {/* Extension Not Available Alert */}
            {serviceAvailable === false && (
              <Alert
                color="warning"
                variant="flat"
                title={t('publish.extension.notAvailable')}
                description={t('publish.extension.installRequired')}
                endContent={
                  <Button
                    color="warning"
                    variant="flat"
                    size="sm"
                    onPress={handleGoToExtension}>
                    {t('publish.extension.goToInstall')}
                  </Button>
                }
              />
            )}

            {/* Platform Selection */}
            {serviceAvailable === true && (
              <>
                {isLoadingPlatforms && (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" />
                    <span className="ml-2 text-sm text-default-500">{t('publish.platform.loading')}</span>
                  </div>
                )}

                {platforms.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">{t('publish.platform.label')}</label>
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

                {!isLoadingPlatforms && platforms.length === 0 && (
                  <Alert
                    color="default"
                    variant="flat"
                    title={t('publish.platform.noPlatforms')}
                    description={t('publish.platform.noPlatformsDescription')}
                  />
                )}

                {/* Auto Publish Settings */}
                {platforms.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">{t('publish.autoPublish.label')}</label>
                    <Card>
                      <CardBody>
                        <div className="space-y-2">
                          <Switch
                            isSelected={isAutoPublish}
                            onValueChange={setIsAutoPublish}>
                            {t('publish.autoPublish.enabled')}
                          </Switch>
                          <p className="text-sm text-default-500">{t('publish.autoPublish.description')}</p>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                )}
              </>
            )}

            {/* Draft Info */}
            {draftId && draftData && (
              <div className="rounded-lg bg-default-50 p-3">
                <p className="text-sm text-default-600">
                  {t('publish.draft.info')}: <span className="font-mono text-xs">{draftId}</span>
                </p>
                <p className="mt-1 text-sm text-default-600">
                  {t('publish.draft.title')}: {draftData.title}
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
            isDisabled={serviceAvailable !== true || platforms.filter((p) => p.selected).length === 0 || !draftData}>
            {t('publish.modal.directPublish')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
