import React from 'react';
import { Card, CardBody, Link, Button } from '@heroui/react';

const AboutTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-6">
          <div className="flex justify-center items-center">
            <img
              src="/assets/icon.png"
              alt="logo"
              className="w-24 h-24 rounded-xl shadow-lg"
            />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold">{chrome.i18n.getMessage('extensionDisplayName')}</h2>
            <p className="text-sm text-foreground/60">v{chrome.runtime.getManifest().version}</p>
          </div>
          <p className="text-base text-center text-foreground/80">{chrome.i18n.getMessage('aboutDescription')}</p>
        </CardBody>
      </Card>

      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-4">
          <Button
            as={Link}
            href="https://multipost.app/about"
            target="_blank"
            rel="noopener noreferrer"
            variant="flat"
            className="justify-center w-full">
            {chrome.i18n.getMessage('readMore') || 'Read More'}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

export default AboutTab;
