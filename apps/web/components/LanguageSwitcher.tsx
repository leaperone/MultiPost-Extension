'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { switchLocaleAction } from '@/i18n/switch-locale';
import { useLocale } from '@/i18n/locale-provider';
import { languages } from '@/i18n/settings';
import { LanguagesIcon } from 'lucide-react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const handleLocaleChange = async (key: React.Key) => {
    await switchLocaleAction(key as string);
    router.refresh();
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          aria-label="Select language">
          <LanguagesIcon />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Language selection"
        onAction={handleLocaleChange}
        selectedKeys={[locale]}
        selectionMode="single">
        {languages.map((language) => (
          <DropdownItem key={language.value}>{language.label}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
