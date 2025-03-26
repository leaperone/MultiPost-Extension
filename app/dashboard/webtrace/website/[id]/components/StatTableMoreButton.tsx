'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@heroui/react';
import { ArrowUpRight } from 'lucide-react';

interface StatTableMoreButtonProps {
  detailType: string;
}

export function StatTableMoreButton({ detailType }: StatTableMoreButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 处理点击查看更多按钮
  const handleViewMore = () => {
    const params = new URLSearchParams(searchParams);
    params.set('detail', detailType);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={handleViewMore}
      className="flex items-center text-sm text-gray-500 hover:text-gray-700">
      查看更多 <ArrowUpRight className="ml-1 size-3" />
    </Button>
  );
}
