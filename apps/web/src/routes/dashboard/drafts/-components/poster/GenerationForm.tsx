'use client';

import {
  Button,
  Textarea,
  Select,
  SelectItem,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tabs,
  Tab,
  Chip,
  Image,
} from '@heroui/react';
import { ImageIcon, Upload, X, FileText, AlertTriangle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import {
  PosterGenerationSchema,
  ImageSize,
  Category,
  SeedeTheme,
  REFERENCE_IMAGE_TAGS,
  EXPORT_FORMATS,
  type ReferenceImageTag,
  type SeedeMaterialData,
  type SeedeDocumentData,
} from '../../../../../actions/draw/poster/types';
import { useTranslation } from '@/i18n/client';
import { useEffect, useState, useRef } from 'react';
import { getAvailableModels, uploadAsset, uploadDocument, parseDocument } from '../../../../../actions/draw/poster';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { getMessageText } from '@/lib/ai-chat';
import { parsePromptResponse } from '@/lib/ai-response-parser';
import { toast } from 'sonner';

interface GenerationFormProps {
  onSubmit: (data: z.infer<typeof PosterGenerationSchema>) => Promise<void>;
  loading?: boolean;
  initialValues?: z.infer<typeof PosterGenerationSchema> | null;
  extraPrompt?: string;
}

// 为 ImageSize 元素定义类型
type ImageSizeItem = (typeof ImageSize)[number];

export function GenerationForm({ onSubmit, loading, initialValues, extraPrompt }: GenerationFormProps) {
  const { t } = useTranslation('poster');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Reference image state
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [selectedRefTags, setSelectedRefTags] = useState<ReferenceImageTag[]>(['style', 'layout', 'color']);
  const [uploadingRefImage, setUploadingRefImage] = useState(false);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  // Materials state
  const [materials, setMaterials] = useState<SeedeMaterialData[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const materialInputRef = useRef<HTMLInputElement>(null);

  // Document state
  const [documents, setDocuments] = useState<SeedeDocumentData[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // useChat for AI prompt optimization
  const {
    messages: aiMessages,
    status: aiStatus,
    sendMessage: sendAiMessage,
  } = useChat({
    transport: new DefaultChatTransport({ api: '/api/draw/poster/prompt' }),
    onFinish: ({ message }) => {
      const result = parsePromptResponse<{ prompt: string }>(getMessageText(message));
      if (result.success && result.data?.prompt) {
        setOptimizedPrompt(result.data.prompt);
      }
    },
  });
  const aiOptimizing = aiStatus === 'submitted' || aiStatus === 'streaming';
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null);

  const form = useForm<z.infer<typeof PosterGenerationSchema>>({
    resolver: zodResolver(PosterGenerationSchema),
    defaultValues: {
      prompt: initialValues?.prompt || '',
      model: initialValues?.model || 'gemini-2.5-flash',
      width: initialValues?.width || 1080,
      height: initialValues?.height || 1440,
      format: initialValues?.format || 'webp',
      category: initialValues?.category || 'category.social_media_generator',
      theme: initialValues?.theme || 'default',
    },
  });

  const selectedModel = form.watch('model');
  const isDeepseek = selectedModel === 'deepseek-v3';

  useEffect(() => {
    async function fetchModels() {
      setLoadingModels(true);
      try {
        const response = await getAvailableModels();
        if (response.success && response.data) {
          setModels(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoadingModels(false);
      }
    }
    fetchModels();
  }, []);

  const setPresetSize = (size: ImageSizeItem) => {
    form.setValue('width', size.width);
    form.setValue('height', size.height);
    setIsPopoverOpen(false);
  };

  const handleOptimizePrompt = () => {
    setOptimizedPrompt(null);
    const currentPrompt = extraPrompt ? `${form.getValues('prompt')} ${extraPrompt}` : form.getValues('prompt');
    void sendAiMessage({ text: currentPrompt });
  };

  const handleFillOptimized = () => {
    if (optimizedPrompt) {
      form.setValue('prompt', optimizedPrompt);
    }
  };

  const selectedCategory = form.watch('category');

  const handleCategoryChange = (category: string) => {
    form.setValue('category', category);
  };

  // Reference image file upload handler
  const handleRefImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('reference_image.file_too_large'));
      return;
    }
    setUploadingRefImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataURL = reader.result as string;
        const img = new window.Image();
        img.onload = async () => {
          const result = await uploadAsset({
            data: {
              dataURL,
              filename: file.name,
              contentType: file.type,
              width: img.width,
              height: img.height,
              size: file.size,
            },
          });
          if (result.success && result.data) {
            setReferenceImageUrl(result.data.url);
          } else {
            toast.error(result.error || t('reference_image.upload_failed'));
          }
          setUploadingRefImage(false);
        };
        img.onerror = () => {
          toast.error(t('reference_image.upload_failed'));
          setUploadingRefImage(false);
        };
        img.src = dataURL;
      };
      reader.onerror = () => {
        toast.error(t('reference_image.upload_failed'));
        setUploadingRefImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error(t('reference_image.upload_failed'));
      setUploadingRefImage(false);
    }
    e.target.value = '';
  };

  // Material upload handler
  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('material.file_too_large'));
      return;
    }
    setUploadingMaterial(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataURL = reader.result as string;
        const img = new window.Image();
        img.onload = async () => {
          const result = await uploadAsset({
            data: {
              dataURL,
              filename: file.name,
              contentType: file.type,
              width: img.width,
              height: img.height,
              size: file.size,
            },
          });
          if (result.success && result.data) {
            setMaterials((prev) => [...prev, result.data!]);
          } else {
            toast.error(result.error || t('material.upload_failed'));
          }
          setUploadingMaterial(false);
        };
        img.onerror = () => {
          toast.error(t('material.upload_failed'));
          setUploadingMaterial(false);
        };
        img.src = dataURL;
      };
      reader.onerror = () => {
        toast.error(t('material.upload_failed'));
        setUploadingMaterial(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error(t('material.upload_failed'));
      setUploadingMaterial(false);
    }
    e.target.value = '';
  };

  // Document upload handler
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDocument(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataURL = reader.result as string;
        const uploadResult = await uploadDocument({
          data: {
            dataURL,
            filename: file.name,
            contentType: file.type,
            size: file.size,
          },
        });
        if (uploadResult.success && uploadResult.data) {
          await parseDocument({
            data: {
              assetId: uploadResult.data.id,
            },
          });
          setDocuments((prev) => [...prev, uploadResult.data!]);
          toast.success(t('document.upload_success'));
        } else {
          toast.error(uploadResult.error || t('document.upload_failed'));
        }
        setUploadingDocument(false);
      };
      reader.onerror = () => {
        toast.error(t('document.upload_failed'));
        setUploadingDocument(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error(t('document.upload_failed'));
      setUploadingDocument(false);
    }
    e.target.value = '';
  };

  // Toggle reference image tag
  const toggleRefTag = (tag: ReferenceImageTag) => {
    setSelectedRefTags((prev) => {
      if (tag === 'all') return ['all'];
      const without = prev.filter((t) => t !== 'all');
      if (without.includes(tag)) {
        return without.filter((t) => t !== tag);
      }
      return [...without, tag];
    });
  };

  // Build final prompt with all decorators
  const handleFormSubmit = async (data: z.infer<typeof PosterGenerationSchema>) => {
    let finalPrompt = data.prompt;

    // Append reference image
    if (referenceImageUrl && !isDeepseek) {
      const tags = selectedRefTags.join(',');
      finalPrompt += `\n@SeedeReferenceImage(url: '${referenceImageUrl}', tag: '${tags}')`;
    }

    // Append materials
    for (const mat of materials) {
      finalPrompt += `\n@SeedeMaterial(${JSON.stringify(mat)})`;
    }

    // Append documents
    for (const doc of documents) {
      finalPrompt += `\n@SeedeDocument(${JSON.stringify(doc)})`;
    }

    await onSubmit({ ...data, prompt: finalPrompt });
  };

  return (
    <div className="space-y-6">
      {/* 类型选择 */}
      <div>
        <div className="mb-3 text-sm font-medium text-foreground">{t('generation_page.category')}</div>
        <div className="flex flex-wrap gap-2">
          {Category.map((item) => (
            <Button
              key={item.name}
              size="sm"
              variant={selectedCategory === item.name ? 'solid' : 'bordered'}
              color={selectedCategory === item.name ? 'primary' : 'default'}
              className={`transition-all ${selectedCategory === item.name ? 'font-medium shadow-sm' : 'border-default-200'}`}
              onPress={() => handleCategoryChange(item.name)}>
              {t(item.name)}
            </Button>
          ))}
        </div>
      </div>

      {/* 提示词输入 */}
      <div>
        <Controller
          name="prompt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Textarea
              {...field}
              isRequired
              label={'Prompt'}
              minRows={4}
              placeholder={t('generation_page.prompt_placeholder')}
              disabled={loading}
              isInvalid={!!fieldState.error}
              errorMessage={fieldState.error?.message}
              classNames={{
                inputWrapper: 'bg-default-50',
              }}
            />
          )}
        />

        {/* AI 优化按钮和结果 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            variant="flat"
            size="sm"
            isLoading={aiOptimizing}
            disabled={aiOptimizing || loading}
            onPress={handleOptimizePrompt}
            className="bg-default-100">
            ✨ {t('generation_page.ai_optimize_prompt')}
          </Button>
          {optimizedPrompt && (
            <Button
              color="success"
              size="sm"
              variant="flat"
              onPress={handleFillOptimized}>
              {t('generation_page.fill_to_input')}
            </Button>
          )}
        </div>
        {aiMessages.length > 0 &&
          (() => {
            const lastSix = aiMessages.slice(-6);
            const lastAssistantMsg = [...lastSix].reverse().find((m) => m.role === 'assistant');
            return lastAssistantMsg ? (
              <div className="mt-2 rounded-lg bg-default-100 p-3 text-sm text-foreground">
                {getMessageText(lastAssistantMsg)}
              </div>
            ) : null;
          })()}
      </div>

      {/* 参考图片 */}
      {!isDeepseek && (
        <div>
          <div className="mb-3 text-sm font-medium text-foreground">{t('reference_image.label')}</div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                size="sm"
                placeholder={t('reference_image.url_placeholder')}
                value={referenceImageUrl}
                onChange={(e) => setReferenceImageUrl(e.target.value)}
                disabled={loading}
                classNames={{ inputWrapper: 'bg-default-50' }}
                className="flex-1"
              />
              <input
                ref={refImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleRefImageUpload}
              />
              <Button
                size="sm"
                variant="bordered"
                isLoading={uploadingRefImage}
                onPress={() => refImageInputRef.current?.click()}
                startContent={!uploadingRefImage && <Upload className="size-4" />}>
                {t('reference_image.upload')}
              </Button>
              {referenceImageUrl && (
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={() => setReferenceImageUrl('')}>
                  <X className="size-4" />
                </Button>
              )}
            </div>
            {referenceImageUrl && (
              <div className="flex flex-wrap gap-1.5">
                {REFERENCE_IMAGE_TAGS.map((tag) => (
                  <Chip
                    key={tag}
                    size="sm"
                    variant={selectedRefTags.includes(tag) ? 'solid' : 'bordered'}
                    color={selectedRefTags.includes(tag) ? 'primary' : 'default'}
                    className="cursor-pointer"
                    onClick={() => toggleRefTag(tag)}>
                    {t(`reference_image.tags.${tag}`)}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {isDeepseek && (
        <div className="flex items-center gap-2 rounded-lg bg-default-100 p-3 text-sm text-default-500">
          <AlertTriangle className="size-4 shrink-0" />
          {t('reference_image.deepseek_warning')}
        </div>
      )}

      {/* 素材图片 */}
      <div>
        <div className="mb-3 text-sm font-medium text-foreground">{t('material.label')}</div>
        <div className="flex flex-wrap gap-3">
          {materials.map((mat, index) => (
            <div
              key={index}
              className="group relative size-20 overflow-hidden rounded-lg border">
              <Image
                src={mat.url}
                alt={mat.filename}
                className="size-full object-cover"
                radius="none"
              />
              <Button
                size="sm"
                isIconOnly
                variant="flat"
                className="absolute right-0.5 top-0.5 z-10 size-5 min-w-0 bg-black/50 opacity-0 group-hover:opacity-100"
                onPress={() => setMaterials((prev) => prev.filter((_, i) => i !== index))}>
                <X className="size-3 text-white" />
              </Button>
            </div>
          ))}
          <input
            ref={materialInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleMaterialUpload}
          />
          <Button
            size="sm"
            variant="bordered"
            className="size-20 border-dashed"
            isLoading={uploadingMaterial}
            onPress={() => materialInputRef.current?.click()}>
            {!uploadingMaterial && (
              <div className="flex flex-col items-center gap-1">
                <Upload className="size-4" />
                <span className="text-xs">{t('material.add')}</span>
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* 文档引用 */}
      <div>
        <div className="mb-3 text-sm font-medium text-foreground">{t('document.label')}</div>
        <div className="flex flex-wrap items-center gap-2">
          {documents.map((doc, index) => (
            <Chip
              key={index}
              variant="bordered"
              onClose={() => setDocuments((prev) => prev.filter((_, i) => i !== index))}
              startContent={<FileText className="size-3" />}>
              {doc.filename}
            </Chip>
          ))}
          <input
            ref={documentInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleDocumentUpload}
          />
          <Button
            size="sm"
            variant="bordered"
            isLoading={uploadingDocument}
            onPress={() => documentInputRef.current?.click()}
            startContent={!uploadingDocument && <FileText className="size-4" />}>
            {t('document.add')}
          </Button>
        </div>
      </div>

      {/* 生成参数设置 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* 尺寸选择 */}
        <Popover
          placement="bottom"
          isOpen={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger>
            <Button
              size="sm"
              variant="bordered"
              className="h-12 w-full justify-center border-default-200"
              disabled={loading}>
              <span className="text-sm">{`${form.getValues('width')} × ${form.getValues('height')}`}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] rounded-xl p-4 shadow-lg">
            <div className="flex flex-col gap-4">
              <Tabs
                aria-label={'size'}
                defaultSelectedKey={'social_media'}
                fullWidth
                size="sm"
                classNames={{
                  tabList: 'w-full bg-default-100 p-1 rounded-lg',
                  tab: 'rounded-md',
                  cursor: 'bg-background shadow-sm',
                  panel: 'pt-4',
                }}>
                <Tab
                  key="social_media"
                  title={t('size.social_media.label')}>
                  <div className="grid grid-cols-1 gap-2">
                    {ImageSize.filter((size) => size.category === 'size.social_media.label').map((size) => (
                      <Button
                        key={size.name}
                        size="sm"
                        variant="light"
                        className="w-full justify-between px-3 hover:bg-default-100"
                        onPress={() => setPresetSize(size)}>
                        <span>{t(size.name)}</span>
                        <span className="text-xs text-default-400">
                          {size.width}×{size.height}
                        </span>
                      </Button>
                    ))}
                  </div>
                </Tab>
                <Tab
                  key="ratio"
                  title={t('size.ratio.label')}>
                  <div className="grid grid-cols-1 gap-2">
                    {ImageSize.filter((size) => size.category === 'size.ratio.label').map((size) => (
                      <Button
                        key={size.name}
                        size="sm"
                        variant="light"
                        className="w-full justify-between px-3 hover:bg-default-100"
                        onPress={() => setPresetSize(size)}>
                        <span>{t(size.name)}</span>
                        <span className="text-xs text-default-400">
                          {size.width}×{size.height}
                        </span>
                      </Button>
                    ))}
                  </div>
                </Tab>
              </Tabs>
              <div className="border-t border-default-100 pt-4">
                <div className="mb-2 text-xs font-medium text-default-500">{t('size.custom')}</div>
                <div className="flex items-center gap-2">
                  <Controller
                    name="width"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        size="sm"
                        label={t('size.width')}
                        value={field.value.toString()}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={loading}
                      />
                    )}
                  />
                  <span className="text-default-400">×</span>
                  <Controller
                    name="height"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        size="sm"
                        label={t('size.height')}
                        value={field.value.toString()}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={loading}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 配色选择 */}
        <Controller
          name="theme"
          control={form.control}
          render={({ field }) => (
            <Select
              label={t('theme.label')}
              size="sm"
              selectedKeys={[field.value || 'default']}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                field.onChange(key);
              }}
              isDisabled={loading}
              classNames={{
                trigger: 'bg-background border-default-200',
              }}
              renderValue={() => {
                const selected = SeedeTheme.find((theme) => theme.value === field.value);
                if (!selected) return null;
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {selected.colors.slice(0, 4).map((color, index) => (
                        <div
                          key={index}
                          className="size-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-xs">{t(selected.label)}</span>
                  </div>
                );
              }}>
              {SeedeTheme.map((theme) => (
                <SelectItem
                  key={theme.value}
                  textValue={t(theme.label)}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {theme.colors.slice(0, 4).map((color, index) => (
                        <div
                          key={index}
                          className="size-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span>{t(theme.label)}</span>
                  </div>
                </SelectItem>
              ))}
            </Select>
          )}
        />

        {/* 模型选择 */}
        <Controller
          name="model"
          control={form.control}
          render={({ field }) => (
            <Select
              label={t('generation_page.model.label')}
              size="sm"
              selectedKeys={[field.value]}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                field.onChange(key);
              }}
              isDisabled={loading || loadingModels}
              classNames={{
                trigger: 'bg-background border-default-200',
              }}>
              {models.map((model) => (
                <SelectItem key={model}>{model}</SelectItem>
              ))}
            </Select>
          )}
        />

        {/* 格式选择 */}
        <Controller
          name="format"
          control={form.control}
          render={({ field }) => (
            <Select
              label={t('generation_page.format.label')}
              size="sm"
              selectedKeys={[field.value]}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                field.onChange(key);
              }}
              isDisabled={loading}
              classNames={{
                trigger: 'bg-background border-default-200',
              }}>
              {EXPORT_FORMATS.map((fmt) => (
                <SelectItem key={fmt}>{fmt.toUpperCase()}</SelectItem>
              ))}
            </Select>
          )}
        />
      </div>

      {/* 生成按钮 */}
      <Button
        color="primary"
        size="lg"
        isLoading={loading}
        fullWidth
        onPress={() => form.handleSubmit(handleFormSubmit)()}
        startContent={!loading && <ImageIcon className="size-5" />}
        className="font-medium shadow-md">
        {loading ? t('generation_page.button.generating') : t('generation_page.button.generate')}
      </Button>
    </div>
  );
}
