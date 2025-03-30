'use client';

import { Select, SelectItem } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';

interface Website {
  id: string;
  name: string;
  domain: string | null;
}

interface WebsiteSelectorProps {
  websites: Website[];
  currentWebsiteId: string;
}

export function WebsiteSelector({ websites, currentWebsiteId }: WebsiteSelectorProps) {
  const router = useRouter();
  const currentWebsite = websites.find((w) => w.id === currentWebsiteId);

  return (
    <Select
      label="选择网站"
      defaultSelectedKeys={[currentWebsiteId]}
      onSelectionChange={(keys) => {
        // 处理 Set 类型的选择值
        const selectedKey = Array.from(keys)[0];
        if (selectedKey) {
          router.push(`/dashboard/analytics/web/${selectedKey}`);
        }
      }}
      selectedKeys={[currentWebsiteId]}
      className="w-full sm:w-[280px]"
      variant="bordered"
      placeholder={currentWebsite?.name || '选择网站'}>
      {websites.map((website) => (
        <SelectItem
          key={website.id}
          value={website.id}
          textValue={website.name}>
          <div className="flex flex-col gap-0.5">
            <span>{website.name}</span>
            {website.domain && (
              <span className="flex items-center text-xs text-default-400">
                <Globe className="mr-1 size-3" />
                {website.domain}
              </span>
            )}
          </div>
        </SelectItem>
      ))}
    </Select>
  );
}
