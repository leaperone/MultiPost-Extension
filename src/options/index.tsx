import "~style.css";
import cssText from "data-text:~style.css";
import type { PlasmoCSConfig } from "plasmo";
import { useEffect } from "react";

export const config: PlasmoCSConfig = {
  // matches: ["https://www.plasmo.com/*"]
};

export function getShadowContainer() {
  return document.querySelector("#test-shadow").shadowRoot.querySelector("#plasmo-shadow-container");
}

export const getShadowHostId = () => "test-shadow";

const BASE_URL = "https://multipost.app";

export const getStyle = () => {
  const style = document.createElement("style");

  style.textContent = cssText;
  return style;
};

const Options = () => {
  useEffect(() => {
    chrome.tabs.getCurrent((tab) => {
      chrome.tabs.create({ url: `${BASE_URL}/dashboard/publish` });
      if (tab?.id) {
        chrome.tabs.remove(tab.id);
      }
    });
  }, []);

  return <div />;
};

export default Options;
