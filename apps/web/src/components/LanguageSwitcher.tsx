import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react';
import { LanguagesIcon } from 'lucide-react';
import type { Key } from 'react';

import { useLocale } from '../i18n/locale-provider';
import { LANGUAGE_COOKIE, languages } from '../i18n/settings';

const ONE_YEAR = 60 * 60 * 24 * 365;

export default function LanguageSwitcher() {
  const locale = useLocale();

  const handleLocaleChange = (key: Key) => {
    document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(String(key))}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
    // TODO(Phase 5): replace the reload with switch-locale createServerFn + router invalidation.
    window.location.reload();
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
