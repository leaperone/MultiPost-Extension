import React from 'react';
import { Card, CardBody, CardFooter, Button, Link, Tooltip } from "@heroui/react";
import { Trash2, ExternalLink } from 'lucide-react';
import type { CollectionItem } from '../../../background/services/collection/type';

interface CollectionItemCardProps {
  item: CollectionItem;
  onDelete: (itemId: string) => void;
}

export function CollectionItemCard({ item, onDelete }: CollectionItemCardProps) {
  return (
    <Card className="w-full">
      <CardBody className="p-3">
        <p className="text-sm">{item.content}</p>
      </CardBody>
      <CardFooter className="justify-between items-center p-2">
        <Tooltip content={item.sourceTitle || '未知来源'}>
          <Link
            href={item.source}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-xs text-default-500 hover:underline"
          >
            <ExternalLink size={12} className="mr-1" />
            {new URL(item.source || '').hostname}
          </Link>
        </Tooltip>
        <Button
          isIconOnly
          size="sm"
          color="danger"
          variant="light"
          onClick={() => onDelete(item.id)}
          aria-label={chrome.i18n.getMessage('sidepanelCollectionItemDeleteButton')}
        >
          <Trash2 size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}
