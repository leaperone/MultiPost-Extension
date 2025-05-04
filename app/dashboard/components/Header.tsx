'use server';

import { Button, Link } from '@heroui/react';
import BalanceButton from './BalanceButton';
import { BookOpenIcon, SettingsIcon } from 'lucide-react';

interface HeaderProps {
  title?: string;
  description?: string;
  isShowBalance?: boolean;
}

export default async function Header({ title, description, isShowBalance = true }: HeaderProps) {
  return (
    <div className="flex items-center justify-between p-2">
      <div>
        {title && <h1 className="text-2xl font-bold">{title}</h1>}
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {isShowBalance && <BalanceButton alert={1} />}
        <Button
          as={Link}
          href="/dashboard/settings"
          variant="light"
          isIconOnly>
          <BookOpenIcon />
        </Button>
        <Button
          variant="light"
          isIconOnly>
          <SettingsIcon />
        </Button>
      </div>
    </div>
  );
}
