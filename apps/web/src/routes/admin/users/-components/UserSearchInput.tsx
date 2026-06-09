import { Button, Input } from '@heroui/react';
import { HashIcon, MailIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';

import { useTranslation } from '../../../../i18n/client';

export function UserSearchModal() {
  const { t } = useTranslation('admin');
  const [query, setQuery] = useState('');

  const isQueryEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(query);
  const href = isQueryEmail
    ? `/admin/user?email=${encodeURIComponent(query)}`
    : `/admin/user?userid=${encodeURIComponent(query)}`;

  return (
    <div className="flex gap-2">
      <Input
        placeholder={t('users.search_placeholder')}
        startContent={isQueryEmail ? <MailIcon /> : <HashIcon />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-lg"
      />
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer">
        <Button
          isIconOnly
          color="primary">
          <SearchIcon />
        </Button>
      </a>
    </div>
  );
}
