import React from 'react';
import { Card, CardBody, Link, Button } from '@heroui/react';
import { Mail, Book, Globe, GithubIcon } from 'lucide-react';

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Button
              as={Link}
              href="https://github.com/leaper-one/MultiPost-Extension"
              target="_blank"
              rel="noopener noreferrer"
              variant="flat"
              className="justify-start w-full">
              <GithubIcon className="mr-2 w-5 h-5" />
              GitHub
            </Button>
            <Button
              as={Link}
              href="https://multipost.app"
              target="_blank"
              rel="noopener noreferrer"
              variant="flat"
              className="justify-start w-full">
              <Book className="mr-2 w-5 h-5" />
              {chrome.i18n.getMessage('optionsViewDocs')}
            </Button>
            <Button
              as={Link}
              href="https://multipost.app"
              target="_blank"
              rel="noopener noreferrer"
              variant="flat"
              className="justify-start w-full">
              <Globe className="mr-2 w-5 h-5" />
              {chrome.i18n.getMessage('options2SOMErenHomepage')}
            </Button>
            <Button
              as={Link}
              href="mailto:support@leaper.one"
              variant="flat"
              className="justify-start w-full">
              <Mail className="mr-2 w-5 h-5" />
              {chrome.i18n.getMessage('optionsFeedbackEmail')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AboutTab;
