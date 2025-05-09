'use client';

import {
  Pin,
  Globe,
  Share2,
  PuzzleIcon,
  SendHorizontal,
  ArrowLeftIcon,
  ArrowRightIcon,
  BotIcon,
  HandIcon,
  Eraser,
} from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import {
  Input,
  Textarea,
  addToast,
  Switch,
  Accordion,
  AccordionItem,
  Image as HeroImage,
  Link,
  Checkbox,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
} from '@heroui/react';
import { useState, useEffect } from 'react';
import { funcPublish, getPlatformInfos } from '@/lib/extension';
import type { PlatformInfo } from '@/lib/extension';
import { Icon } from '@iconify/react';

interface SimplePlatformProps {
  platformInfo: PlatformInfo;
  isSelected: boolean;
  onChange: (platform: string, isSelected: boolean) => void;
}

const SimplePlatform = ({ platformInfo, isSelected, onChange }: SimplePlatformProps) => {
  const profileUrl = platformInfo.accountInfo?.profileUrl || platformInfo.homeUrl;

  return (
    <div className="flex items-center rounded-lg p-2 transition-colors hover:bg-default-100">
      <div className="flex flex-1 items-center gap-2">
        <Checkbox
          isSelected={isSelected}
          onChange={(e) => onChange(platformInfo.name, e.target.checked)}
          size="sm"
        />

        <div className="flex items-center gap-1.5">
          {platformInfo.iconifyIcon ? (
            <Icon
              icon={platformInfo.iconifyIcon}
              className="size-5"
            />
          ) : (
            platformInfo.faviconUrl && (
              <HeroImage
                src={platformInfo.faviconUrl}
                alt={platformInfo.platformName}
                width={20}
                height={20}
                className="rounded-sm"
              />
            )
          )}

          <span className="truncate text-sm font-medium">{platformInfo.platformName || platformInfo.name}</span>
        </div>

        {platformInfo.accountInfo && (
          <div className="ml-auto flex items-center gap-1">
            {platformInfo.accountInfo.avatarUrl && (
              <HeroImage
                src={platformInfo.accountInfo.avatarUrl}
                alt={`${platformInfo.platformName} avatar`}
                width={18}
                height={18}
                className="rounded-full"
              />
            )}
            <Link
              href={profileUrl}
              isExternal
              className="flex max-w-[80px] items-center gap-1 truncate text-xs text-default-600 hover:text-primary">
              {platformInfo.accountInfo.username}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default function OnInstallPage() {
  const { t } = useTranslation('install');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [title, setTitle] = useState<string>('Hello World from MultiPost');
  const [content, setContent] = useState<string>(
    'My first post via #MultiPost , post your content to multiple platforms with one click',
  );
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [autoPublish, setAutoPublish] = useState<boolean>(true);

  useEffect(() => {
    async function fetchPlatforms() {
      try {
        const platformData = await getPlatformInfos('DYNAMIC');
        setPlatforms(platformData);
      } catch (error) {
        console.error('Error fetching platforms:', error);
      }
    }
    fetchPlatforms();
  }, []);

  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => {
      const newSelected = isSelected ? [...prev, platform] : prev.filter((p) => p !== platform);
      return newSelected;
    });
  };

  const handlePublish = async () => {
    if (!content) {
      addToast({
        title: t('validation.contentRequired'),
        color: 'danger',
      });
      return;
    }
    if (selectedPlatforms.length === 0) {
      addToast({
        title: t('validation.platformRequired'),
        color: 'danger',
      });
      return;
    }

    const data = {
      platforms: platforms.filter((platform) => selectedPlatforms.includes(platform.name)),
      data: {
        title,
        content,
        images: [],
        videos: [],
      },
      isAutoPublish: autoPublish,
    };

    try {
      funcPublish(data);
      addToast({
        title: t('publish.success'),
        color: 'success',
      });
    } catch (error) {
      console.error('Error publishing:', error);
      addToast({
        title: t('publish.error'),
        color: 'danger',
      });
    }
  };

  const handleNextStep = () => {
    if (!content) {
      addToast({
        title: t('validation.contentRequired'),
        color: 'danger',
      });
      return;
    }
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  return (
    <div className="h-full min-h-screen">
      {/* Extension Instructions */}
      <ExtensionInstructions />
      <div className="relative z-10 mx-auto max-w-3xl space-y-8 pt-20">
        {/* Header */}
        <div className="space-y-4 text-center">
          <h1 className="bg-gradient-to-r from-blue-400 via-blue-200 to-purple-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            {t('title')}
          </h1>
          <p className="text-gray-300">{t('subtitle')}</p>
        </div>

        {/* First Post Form */}
        <Card className="border-border/40 bg-card/30 p-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <CardBody className="space-y-4">
            <h2 className="text-xl font-semibold text-white">{t('firstPost.title')}</h2>

            {currentStep === 1 ? (
              <div className="flex flex-col gap-4">
                <Card className="h-fit bg-default-50 shadow-none">
                  <CardHeader>
                    <Input
                      isClearable
                      variant="underlined"
                      placeholder={t('firstPost.titlePlaceholder')}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onClear={() => setTitle('')}
                      className="w-full"
                    />
                  </CardHeader>

                  <CardBody>
                    <Textarea
                      isClearable
                      variant="underlined"
                      placeholder={t('firstPost.contentPlaceholder')}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onClear={() => setContent('')}
                      fullWidth
                      minRows={3}
                      autoFocus
                    />
                  </CardBody>
                </Card>

                <Button
                  className="w-full"
                  color="primary"
                  onPress={handleNextStep}>
                  <ArrowRightIcon />
                </Button>
              </div>
            ) : (
              <>
                <Card className="mb-4 bg-default-50 shadow-none">
                  <CardBody className="gap-2">
                    <div className="flex items-center justify-between">
                      <Switch
                        isSelected={autoPublish}
                        onValueChange={setAutoPublish}
                        startContent={<BotIcon className="size-4" />}
                        endContent={<HandIcon className="size-4" />}>
                        {t('firstPost.autoPublish')}
                      </Switch>
                      <div className="flex items-center justify-between">
                        {selectedPlatforms.length > 0 && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => setSelectedPlatforms([])}>
                            <Eraser className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <Accordion
                      isCompact
                      variant="light"
                      selectionMode="multiple"
                      defaultExpandedKeys={['CN', 'International']}>
                      <AccordionItem
                        key="CN"
                        title={t('platforms.cn')}
                        subtitle={`${
                          selectedPlatforms.filter((platform) => {
                            const info = platforms.find((p) => p.name === platform);
                            return info?.tags?.includes('CN');
                          }).length
                        }/${platforms.filter((platform) => platform.tags?.includes('CN')).length}`}
                        startContent={
                          <div className="w-8">
                            <Icon
                              icon="openmoji:flag-china"
                              className="h-max w-full"
                            />
                          </div>
                        }
                        className="py-1">
                        <div className="grid grid-cols-2 gap-2">
                          {platforms
                            .filter((platform) => platform.tags?.includes('CN'))
                            .map((platform) => (
                              <SimplePlatform
                                key={platform.name}
                                platformInfo={platform}
                                isSelected={selectedPlatforms.includes(platform.name)}
                                onChange={handlePlatformChange}
                              />
                            ))}
                        </div>
                      </AccordionItem>
                      <AccordionItem
                        key="International"
                        title={t('platforms.international')}
                        subtitle={`${
                          selectedPlatforms.filter((platform) => {
                            const info = platforms.find((p) => p.name === platform);
                            return info?.tags?.includes('International');
                          }).length
                        }/${platforms.filter((platform) => platform.tags?.includes('International')).length}`}
                        startContent={
                          <div className="w-8">
                            <Icon
                              icon="openmoji:globe-with-meridians"
                              className="h-max w-full"
                            />
                          </div>
                        }
                        className="py-1">
                        <div className="grid grid-cols-2 gap-2">
                          {platforms
                            .filter((platform) => platform.tags?.includes('International'))
                            .map((platform) => (
                              <SimplePlatform
                                key={platform.name}
                                platformInfo={platform}
                                isSelected={selectedPlatforms.includes(platform.name)}
                                onChange={handlePlatformChange}
                              />
                            ))}
                        </div>
                      </AccordionItem>
                    </Accordion>
                  </CardBody>
                </Card>

                <div className="flex gap-2">
                  <Button
                    color="default"
                    aria-label="back_to_edit"
                    onPress={handlePrevStep}>
                    <ArrowLeftIcon />
                  </Button>

                  <Button
                    aria-label="publish"
                    className="w-full"
                    color={selectedPlatforms.length === 0 ? 'default' : 'primary'}
                    disabled={selectedPlatforms.length === 0}
                    onPress={handlePublish}>
                    <SendHorizontal />
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* Main Features */}
        <Card className="border-border/40 bg-card/30 p-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <CardBody>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-500/20 p-2">
                  <Share2 className="size-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{t('features.multiPlatform.title')}</h3>
                  <p className="text-sm text-gray-300">{t('features.multiPlatform.description')}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-500/20 p-2">
                  <Globe className="size-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{t('features.noLogin.title')}</h3>
                  <p className="text-sm text-gray-300">{t('features.noLogin.description')}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-500/20 p-2">
                  <Pin className="size-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{t('features.integration.title')}</h3>
                  <p className="text-sm text-gray-300">{t('features.integration.description')}</p>
                </div>
              </div>
            </div>
          </CardBody>
          <CardFooter>
            <Button
              as={Link}
              href="/dashboard/publish"
              color="primary"
              className="w-full">
              Go to Publish
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

const ExtensionInstructions = () => {
  const { t } = useTranslation('install');

  return (
    <div className="fixed right-4 top-20">
      <div className="relative w-[280px] overflow-hidden rounded-xl bg-gradient-to-br from-blue-600/90 to-purple-600/90 p-4 shadow-2xl">
        {/* Top Arrow */}
        <div className="absolute -top-2 right-6 size-4 -translate-y-1/2 rotate-45 bg-gradient-to-br from-blue-600 to-purple-600" />

        {/* Corner Arrow */}
        <div className="absolute right-4 top-4 flex size-4 items-center justify-center">
          <div className="relative size-2 rotate-45 border-r border-t border-blue-200/60" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-purple-400/30 backdrop-blur" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3 border-b border-white/20 pb-3">
            <PuzzleIcon className="text-blue-200" />
            <p className="text-sm font-medium text-blue-50">{t('instructions.step1')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Pin className="text-blue-200" />
            <p className="text-sm font-medium text-blue-50">{t('instructions.step2')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
