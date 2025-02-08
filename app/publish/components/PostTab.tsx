'use client';
import React, { useState, useRef } from 'react';
import { Card, Button, Image, Input, Textarea, CardHeader, CardBody, CardFooter } from '@heroui/react';
import { ImagePlusIcon, XIcon, DownloadIcon } from 'lucide-react';
import Viewer from 'react-viewer';
import type { FileData, SyncData } from '@/types/sync';

interface PostTabProps {
  funcPublish: (data: SyncData) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  funcScraper: (url: string) => Promise<any>;
}

const PostTab: React.FC<PostTabProps> = ({ funcPublish, funcScraper }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [url, setUrl] = useState<string>('');
  const [importedContent, setImportedContent] = useState<{
    title: string;
    content: string;
    digest: string;
    cover: string;
    author: string;
  } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const newFiles: FileData[] = Array.from(selectedFiles)
        .filter((file) => file.type.startsWith('image/'))
        .map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
        }));
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => (isSelected ? [...prev, platform] : prev.filter((p) => p !== platform)));
  };

  const handlePublish = async () => {
    if (!title || !content) {
      console.log('Please enter title and content');
      return;
    }
    if (selectedPlatforms.length === 0) {
      console.log('Please select at least one platform');
      return;
    }
    const data: SyncData = {
      platforms: selectedPlatforms,
      data: {
        title,
        content,
        // images: files,
      },
      auto_publish: false,
    };
    console.log(data);

    funcPublish(data);
  };

  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = (index: number) => {
    setCurrentImage(index);
    setViewerVisible(true);
  };

  const handleDeleteImage = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    if (!url) {
      console.log('Please enter a valid URL');
      return;
    }
    console.log('url', url);
    funcScraper(url).then((res) => {
      console.log('res', res);
      if (res && res.title && res.content) {
        setImportedContent({
          title: res.title,
          content: res.content,
          digest: res.digest || '',
          cover: res.cover || '',
          author: res.author || '',
        });
        setTitle(res.title);
        setContent(res.digest);
      }
    });
  };

  return (
    <>
      <Card className="mb-4 h-fit bg-default-50 shadow-none">
        <CardBody>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Enter URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="grow"
            />
            <Button
              onPress={handleImport}
              isDisabled={!url}>
              <DownloadIcon />
              Import
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="h-fit bg-default-50 shadow-none">
        <CardHeader>
          <Input
            placeholder="Enter post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            placeholder="Enter post content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            fullWidth
            minRows={10}
            autoFocus
          />
        </CardBody>

        <CardFooter>
          <div className="mb-4 flex justify-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <Button
              isIconOnly
              variant="light"
              onPress={handleIconClick}>
              <ImagePlusIcon className="size-8 text-gray-600" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Card className="my-2 h-full bg-default-50 shadow-none">
        <CardBody className="flex flex-row flex-wrap items-center justify-center gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="group relative">
              <Image
                src={file.url}
                alt={file.name}
                width={100}
                height={100}
                className="cursor-pointer rounded-md object-cover"
                onClick={() => handleImageClick(index)}
              />
              <Button
                isIconOnly
                size="sm"
                color="danger"
                className="absolute right-0 top-0 z-50 m-1 opacity-0 transition-opacity group-hover:opacity-100"
                onPress={() => handleDeleteImage(index)}>
                <XIcon className="size-4" />
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>

      <Viewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        images={files.map((file) => ({ src: file.url, alt: file.name }))}
        activeIndex={currentImage}
      />

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium">Select Publishing Platforms</p>
        <div className="grid grid-cols-2 gap-2"></div>
      </div>
      <Button
        onPress={handlePublish}
        color="primary"
        disabled={!title || !content || selectedPlatforms.length === 0}
        className="w-full px-4 py-2 font-bold">
        Sync Post
      </Button>

      {importedContent && (
        <Card className="my-4 bg-default-50 shadow-none">
          <CardHeader>
            <h3 className="text-lg font-bold">Imported Content</h3>
            <Image
              src={importedContent.cover}
              alt={importedContent.title}
              width={100}
              height={100}
              className="cursor-pointer rounded-md object-cover"
              onClick={() => handleImageClick(0)}
            />
          </CardHeader>
          <CardBody>
            <h4 className="mb-2 font-semibold">{importedContent.title}</h4>
            <p className="mb-4 text-sm">{importedContent.digest}</p>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: importedContent.content }}
            />
          </CardBody>
        </Card>
      )}
    </>
  );
};

export default PostTab;
