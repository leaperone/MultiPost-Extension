import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react';
import { useRouter } from '@tanstack/react-router';
import { LanguagesIcon } from 'lucide-react';
import type { Key } from 'react';
import { useState } from 'react';

import { changeClientLanguage } from '../i18n/client';
import { useLocale } from '../i18n/locale-provider';
import { languages, supportedLocales, type Locales } from '../i18n/settings';
import { switchLocale } from '../i18n/switch-locale';

export default function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const [isPending, setIsPending] = useState(false);

  const handleLocaleChange = async (key: Key) => {
    const nextLocale = String(key);
    if (!supportedLocales.includes(nextLocale as Locales) || nextLocale === locale) {
      return;
    }

    setIsPending(true);
    try {
      const localeValue = nextLocale as Locales;
      await changeClientLanguage(localeValue);
      await switchLocale({ data: { locale: localeValue } });
      await router.invalidate();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          aria-label="Select language"
          isLoading={isPending}
          isDisabled={isPending}>
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
