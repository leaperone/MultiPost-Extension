import React, { useEffect, useState } from 'react';
import { Card, CardBody, Input, Button, Chip } from '@heroui/react';
import { Plus } from 'lucide-react';
import { Storage } from '@plasmohq/storage';

interface TrustedDomain {
  id: string;
  domain: string;
}

const storage = new Storage({ area: 'local' });
const STORAGE_KEY = 'trustedDomains';

const SettingsTab: React.FC = () => {
  const [newDomain, setNewDomain] = useState('');
  const [trustedDomains, setTrustedDomains] = useState<TrustedDomain[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrustedDomains();
  }, []);

  const loadTrustedDomains = async () => {
    const domains = (await storage.get<TrustedDomain[]>(STORAGE_KEY)) || [];
    setTrustedDomains(domains);
  };

  const validateDomain = (domain: string) => {
    const pattern = /^(\*\.)?([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    return pattern.test(domain);
  };

  const handleAddDomain = async () => {
    if (!newDomain) {
      setError(chrome.i18n.getMessage('settingsDomainEmpty'));
      return;
    }

    if (!validateDomain(newDomain)) {
      setError(chrome.i18n.getMessage('settingsDomainInvalid'));
      return;
    }

    const newDomainItem: TrustedDomain = {
      id: crypto.randomUUID(),
      domain: newDomain,
    };

    const updatedDomains = [...trustedDomains, newDomainItem];
    await storage.set(STORAGE_KEY, updatedDomains);
    setTrustedDomains(updatedDomains);
    setNewDomain('');
    setError('');
  };

  const handleRemoveDomain = async (id: string) => {
    const updatedDomains = trustedDomains.filter((domain) => domain.id !== id);
    await storage.set(STORAGE_KEY, updatedDomains);
    setTrustedDomains(updatedDomains);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-4">
          <h3 className="text-lg font-semibold">{chrome.i18n.getMessage('settingsTrustedDomains')}</h3>
          <div className="space-y-2">
            <p className="text-sm text-foreground/60">{chrome.i18n.getMessage('settingsTrustedDomainsDesc')}</p>
            <p className="text-sm text-foreground/60">{chrome.i18n.getMessage('settingsTrustedDomainsWarning')}</p>
          </div>

          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="*.multipost.app"
              className="flex-1"
              isInvalid={!!error}
              errorMessage={error}
            />
            <Button
              onClick={handleAddDomain}
              className="min-w-[100px]">
              <Plus className="w-4 h-4 mr-1" />
              {chrome.i18n.getMessage('settingsAdd')}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {trustedDomains.map((domain) => (
              <Chip
                key={domain.id}
                onClose={() => handleRemoveDomain(domain.id)}
                variant="flat"
                className="bg-default-100">
                {domain.domain}
              </Chip>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SettingsTab;
