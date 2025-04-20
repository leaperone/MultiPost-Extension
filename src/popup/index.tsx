import '~style.css';
import cssText from 'data-text:~style.css';
import type { PlasmoCSConfig } from 'plasmo';
import React, { useEffect } from 'react';

export const config: PlasmoCSConfig = {
  // matches: ["https://www.plasmo.com/*"]
};

export function getShadowContainer() {
  return document.querySelector('#test-shadow').shadowRoot.querySelector('#plasmo-shadow-container');
}

export const getShadowHostId = () => 'test-shadow';

const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://multipost.app'

export const getStyle = () => {
  const style = document.createElement('style');

  style.textContent = cssText;
  return style;
};

const IndexPopup = () => {
  useEffect(() => {
    chrome.tabs.create({ url: `${BASE_URL}/dashboard/publish` });
  }, []);

  return <div></div>;
};

export default IndexPopup;
