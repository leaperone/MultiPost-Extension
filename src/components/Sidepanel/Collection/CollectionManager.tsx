import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectItem,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  useDisclosure,
} from "@heroui/react";
import { Plus } from 'lucide-react';
import type { Collection, CollectionItem } from '~background/services/collection/type';
import { CollectionService } from '~background/services/collection/store';
import { CollectionItemCard } from './CollectionItemCard';

export default function CollectionManager() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [newCollectionTitle, setNewCollectionTitle] = useState<string>('');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [currentItems, setCurrentItems] = useState<CollectionItem[]>([]);

  useEffect(() => {
    async function initializeCollections() {
      try {
        const fetchedCollections = await CollectionService.getCollections();
        setCollections(fetchedCollections);

        const currentCollection = await CollectionService.getCurrentCollection();
        if (currentCollection) {
          setSelectedCollectionId(currentCollection.id);
          setCurrentItems(currentCollection.items);
        } else if (fetchedCollections.length > 0) {
          setSelectedCollectionId(fetchedCollections[0].id);
          setCurrentItems(fetchedCollections[0].items);
        }
      } catch (error) {
        console.error('获取收藏夹列表失败:', error);
        // 这里可以添加错误处理逻辑，比如显示一个错误提示
      }
    }

    initializeCollections();

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'MUTLIPOST_EXTENSION_COLLECTION_CHANGE') {
        console.log('MUTLIPOST_EXTENSION_COLLECTION_CHANGE', message.collectionId);
        handleCollectionChange(message.collectionId);
        sendResponse({ success: true });
      }
      return true;
    });
  }, []);

  const handleCollectionChange = async (newId: string) => {
    setSelectedCollectionId(newId);
    await CollectionService.setCurrentCollection(newId);
    const collection = await CollectionService.getCollectionById(newId);
    setCurrentItems(collection?.items || []);
  };

  const handleAddCollection = async () => {
    if (newCollectionTitle.trim()) {
      try {
        const newCollection = await CollectionService.addCollection(newCollectionTitle.trim());
        setCollections((prevCollections) => [newCollection, ...prevCollections]);
        await handleCollectionChange(newCollection.id);
        setNewCollectionTitle('');
        onOpenChange();
      } catch (error) {
        console.error('添加收藏夹失败:', error);
        // 这里可以添加错误处理逻辑，比如显示一个错误提示
      }
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await CollectionService.deleteItemFromCollection(selectedCollectionId, itemId);
      setCurrentItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('删除项目失败:', error);
      // 这里可以添加错误处理逻辑
    }
  };

  return (
    <>
      <div className="flex items-center mt-4 space-x-2">
        {collections.length > 0 ? (
          <Select
            placeholder={chrome.i18n.getMessage('sidepanelCollectionSelectPlaceholder')}
            selectedKeys={selectedCollectionId ? [selectedCollectionId] : []}
            className="max-w-xs grow"
            onSelectionChange={(keys) => handleCollectionChange(Array.from(keys)[0] as string)}>
            {collections.map((collection) => (
              <SelectItem
                key={collection.id}
                value={collection.id}>
                {collection.title}
              </SelectItem>
            ))}
          </Select>
        ) : (
          <div className="text-center text-gray-500 grow">{chrome.i18n.getMessage('sidepanelCollectionEmpty')}</div>
        )}
        <Button
          isIconOnly
          color="primary"
          aria-label={chrome.i18n.getMessage('sidepanelCollectionAddButtonLabel')}
          onClick={onOpen}>
          <Plus />
        </Button>
      </div>

      <div className="mt-4">
        {currentItems.length > 0 ? (
          <ul className="space-y-2">
            {currentItems
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((item) => (
                <CollectionItemCard
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteItem}
                />
              ))}
          </ul>
        ) : (
          <p className="text-gray-500">{chrome.i18n.getMessage('sidepanelCollectionItemsEmpty')}</p>
        )}
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {chrome.i18n.getMessage('sidepanelCollectionAddNewTitle')}
              </ModalHeader>
              <ModalBody>
                <Input
                  autoFocus
                  label={chrome.i18n.getMessage('sidepanelCollectionNameLabel')}
                  placeholder={chrome.i18n.getMessage('sidepanelCollectionNamePlaceholder')}
                  value={newCollectionTitle}
                  onChange={(e) => setNewCollectionTitle(e.target.value)}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}>
                  {chrome.i18n.getMessage('sidepanelCollectionCancelButton')}
                </Button>
                <Button
                  color="primary"
                  onPress={handleAddCollection}>
                  {chrome.i18n.getMessage('sidepanelCollectionAddButton')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
