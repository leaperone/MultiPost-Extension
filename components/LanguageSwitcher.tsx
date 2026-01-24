'use client';
import React from 'react';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { switchLocaleAction } from '@/i18n/switch-locale';
import { useTranslation } from '@/i18n/client';
import { languages } from '@/i18n/settings';
import { LanguagesIcon } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation('home');

  const handleLocaleChange = (key: React.Key) => {
    switchLocaleAction(key as string);
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
        selectedKeys={i18n.resolvedLanguage ? [i18n.resolvedLanguage] : []}
        selectionMode="single">
        {languages.map((language) => (
          <DropdownItem key={language.value}>{language.label}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
