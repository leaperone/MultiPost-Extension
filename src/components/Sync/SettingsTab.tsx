import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/react';
import { X } from 'lucide-react';
import { Storage } from '@plasmohq/storage';

interface TrustedDomain {
  id: string;
  domain: string;
}

const storage = new Storage({ area: 'local' });
const STORAGE_KEY = 'trustedDomains';

const SettingsTab: React.FC = () => {
  const [trustedDomains, setTrustedDomains] = useState<TrustedDomain[]>([]);

  useEffect(() => {
    loadTrustedDomains();
  }, []);

  const loadTrustedDomains = async () => {
    const domains = (await storage.get<TrustedDomain[]>(STORAGE_KEY)) || [];
    setTrustedDomains(domains);
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
            {/* <p className="text-sm text-foreground/60">{chrome.i18n.getMessage('settingsTrustedDomainsDesc')}</p> */}
            <p className="text-sm text-foreground/60">{chrome.i18n.getMessage('settingsTrustedDomainsWarning')}</p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            {trustedDomains.map((domain) => (
              <div
                key={domain.id}
                className="flex justify-between items-center p-2 w-full rounded-lg bg-default-100">
                <span className="text-sm">{domain.domain}</span>
                <button
                  onClick={() => handleRemoveDomain(domain.id)}
                  className="p-1 rounded-full transition-colors hover:bg-default-200">
                  <X className="w-4 h-4 text-default-500" />
                </button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SettingsTab;
