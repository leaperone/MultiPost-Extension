import { Button, Image } from '@heroui/react';
import { BookOpenText, LayoutDashboardIcon, SendIcon } from 'lucide-react';
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center px-4 py-2">
        <div className="flex items-center">
          <Image
            src={chrome.runtime.getURL('assets/icon.png')}
            alt="logo"
            className="mr-2 w-8 h-8 rounded-full"
          />
          <a
            href="https://multipost.app"
            target="_blank"
            className="hover:text-blue-600">
            <h1 className="text-lg font-semibold">{chrome.i18n.getMessage('optionsTitle')}</h1>
          </a>
        </div>
        <div className="flex gap-4 items-center">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            as="a"
            target="_blank"
            href="https://multipost.app/dashboard"
            startContent={<LayoutDashboardIcon size={16} />}>
            <span className="text-sm">{chrome.i18n.getMessage('optionViewHomePageDashboard')}</span>
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            as="a"
            target="_blank"
            href="https://multipost.app/dashboard/publish"
            startContent={<SendIcon size={16} />}>
            <span className="text-sm">{chrome.i18n.getMessage('optionViewHomePagePublish')}</span>
          </Button>
          <Button
            isDisabled
            size="sm"
            variant="flat"
            color="primary"
            as="a"
            target="_blank"
            href="https://multipost.app"
            startContent={<BookOpenText size={16} />}>
            <span className="text-sm">{chrome.i18n.getMessage('optionsViewDocs')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
