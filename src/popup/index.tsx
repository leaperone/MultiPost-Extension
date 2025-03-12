import '~style.css';
import cssText from 'data-text:~style.css';
import type { PlasmoCSConfig } from 'plasmo';
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import icon from 'data-base64:~/../assets/icon.png';

export const config: PlasmoCSConfig = {
  // matches: ["https://www.plasmo.com/*"]
};

export function getShadowContainer() {
  return document.querySelector('#test-shadow').shadowRoot.querySelector('#plasmo-shadow-container');
}

export const getShadowHostId = () => 'test-shadow';

export const getStyle = () => {
  const style = document.createElement('style');

  style.textContent = cssText;
  return style;
};

const IndexPopup = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      chrome.runtime.openOptionsPage();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-[300px] h-[200px] flex flex-col items-center justify-center bg-white dark:bg-gray-900">
      <img
        src={icon}
        alt={chrome.i18n.getMessage('popupLogoAlt')}
        className="object-contain mb-4 w-16 h-16"
      />
      <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{chrome.i18n.getMessage('popupLoadingMessage')}</p>
    </div>
  );
};

export default IndexPopup;
