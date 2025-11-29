'use client';

import React, { useState } from 'react';
import { Input, Button, Link } from '@heroui/react';
import { HashIcon, MailIcon, SearchIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/client';

export function UserSearchModal() {
  const { t } = useTranslation('admin');
  const [query, setQuery] = useState('');

  const isQueryEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(query);

  return (
    <div className="flex gap-2">
      <Input
        placeholder={t('users.search_placeholder')}
        startContent={isQueryEmail ? <MailIcon /> : <HashIcon />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-lg"
      />
      <Button
        as={Link}
        href={isQueryEmail ? `/admin/user?email=${query}` : `/admin/user?userid=${query}`}
        target="_blank"
        isIconOnly
        color="primary">
        <SearchIcon />
      </Button>
    </div>
  );
}
