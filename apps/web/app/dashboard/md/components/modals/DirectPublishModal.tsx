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
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import PlatformCheckbox from '@/app/dashboard/publish/components/PlatformCheckbox';
import {
  checkServiceStatus,
  getPlatformInfos,
  funcPublish,
  type PlatformInfo,
  type SyncData,
  type DynamicData,
} from '@/lib/extension';
import { useDraftStore } from '@/store/draft.store';
import { useMdDraftStore } from '@/store/md-draft.store';

interface Platform extends PlatformInfo {
  selected: boolean;
}

interface DirectPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DirectPublishModal({
  isOpen,
  onClose,
  onSuccess,
}: DirectPublishModalProps) {
  const { t } = useTranslation('draft');
  const router = useRouter();
  const activeDraftId = useMdDraftStore((s) => s.activeDraftId);
  const currentTitle = useMdDraftStore((s) => s.currentTitle);
  const currentContent = useMdDraftStore((s) => s.currentContent);
  const currentFiles = useMdDraftStore((s) => s.currentFiles);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [isCheckingService, setIsCheckingService] = useState(false);

  const { directSelectedPlatforms, isAutoPublish, setDirectSelectedPlatforms, setIsAutoPublish } = useDraftStore();

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

  const restorePlatformSelections = (platformList: Platform[]) => {
    return platformList.map((platform) => ({
      ...platform,
      selected: directSelectedPlatforms.includes(platform.name),
    }));
  };

  const fetchPlatforms = async () => {
    setIsLoadingPlatforms(true);
    try {
      const platformList = await getPlatformInfos('DYNAMIC');
      const platformsWithSelection = platformList.map((platform) => ({
        ...platform,
        selected: false,
      }));
      const restoredPlatforms = restorePlatformSelections(platformsWithSelection);
      setPlatforms(restoredPlatforms);
    } catch (error) {
      console.error('Error fetching platforms:', error);
      toast.error(t('publish.toast.fetchPlatformsFailed'));
    } finally {
      setIsLoadingPlatforms(false);
    }
  };

  const handlePlatformToggle = (platformName: string, isSelected: boolean) => {
    setPlatforms((prev) => {
      const updated = prev.map((platform) =>
        platform.name === platformName ? { ...platform, selected: isSelected } : platform,
      );
      const selectedPlatformNames = updated.filter((p) => p.selected).map((p) => p.name);
      setDirectSelectedPlatforms(selectedPlatformNames);
      return updated;
    });
  };

  const handlePlatformExtraConfigChange = (platformName: string, extraConfig: unknown) => {
    setPlatforms((prev) =>
      prev.map((platform) => (platform.name === platformName ? { ...platform, extraConfig } : platform)),
    );
  };

  const handleGoToExtension = () => {
    router.push('/extension');
    onClose();
  };

  const handlePublish = async () => {
    if (!activeDraftId) {
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
      // Save draft before publishing to ensure latest content is persisted
      await useMdDraftStore.getState().saveDraft();
      const dynamicData: DynamicData = {
        title: currentTitle,
        content: currentContent,
        images: currentFiles
          .filter((f) => f.type.startsWith('image'))
          .map((f) => ({
            id: f.rid || '',
            name: f.name,
            url: f.url,
            type: f.type,
            size: f.size,
            originUrl: f.url,
          })),
        videos: currentFiles
          .filter((f) => f.type.startsWith('video'))
          .map((f) => ({
            id: f.rid || '',
            name: f.name,
            url: f.url,
            type: f.type,
            size: f.size,
            originUrl: f.url,
          })),
      };

      const syncData: SyncData = {
        platforms: selectedPlatformsData.map((p) => ({
          ...p,
          extraConfig: p.extraConfig,
        })),
        isAutoPublish,
        data: dynamicData,
      };

      await funcPublish(syncData);

      toast.success(t('publish.toast.publishSuccess'));
      onSuccess?.();
      onClose();
      setPlatforms((prev) => prev.map((p) => ({ ...p, selected: false })));
    } catch (error) {
      console.error('Error publishing through extension:', error);
      toast.error(t('publish.toast.publishFailed'));
    } finally {
      setIsPublishing(false);
    }
  };

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
            {isCheckingService && (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
                <span className="ml-2 text-sm text-default-500">{t('publish.extension.checkingService')}</span>
              </div>
            )}

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

            {activeDraftId && (
              <div className="rounded-lg bg-default-50 p-3">
                <p className="text-sm text-default-600">
                  {t('publish.draft.info')}: <span className="font-mono text-xs">{activeDraftId}</span>
                </p>
                <p className="mt-1 text-sm text-default-600">
                  {t('publish.draft.title')}: {currentTitle}
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
            isDisabled={serviceAvailable !== true || platforms.filter((p) => p.selected).length === 0 || !activeDraftId}>
            {t('publish.modal.directPublish')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
