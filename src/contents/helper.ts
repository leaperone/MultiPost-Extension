/* eslint-disable prefer-const */

export {};
import type { PlasmoCSConfig } from 'plasmo';
import { handleBilibiliImageUpload } from './helper/bilibili';
import { handleBlueskyVideoUpload, handleBlueskyImageUpload } from './helper/bluesky';

export const config: PlasmoCSConfig = {
  matches: ['https://t.bilibili.com/*', 'https://bsky.app/*', 'https://www.v2ex.com/write*', 'https://v2ex.com/write*'],
  world: 'MAIN',
  run_at: 'document_start',
};

interface CodeMirrorElement extends HTMLDivElement {
  CodeMirror: {
    setValue: (content: string) => void;
  };
}

let originalCreateElement = document.createElement.bind(document);
export let createdInputs: HTMLInputElement[] = [];

document.createElement = function (tagName, options) {
  let element = originalCreateElement(tagName, options);
  if (tagName.toLowerCase() === 'input') {
    createdInputs.push(element);
  }
  return element;
};

function handleMessage(event: MessageEvent) {
  const data = event.data;

  if (data.type === 'BILIBILI_DYNAMIC_UPLOAD_IMAGES') {
    handleBilibiliImageUpload(event);
  } else if (data.type === 'BLUESKY_VIDEO_UPLOAD') {
    handleBlueskyVideoUpload(event);
  } else if (data.type === 'BLUESKY_IMAGE_UPLOAD') {
    handleBlueskyImageUpload(event);
  } else if (data.type === 'V2EX_DYNAMIC_UPLOAD') {
    const editor = document.querySelector('.CodeMirror') as CodeMirrorElement;
    if (editor) {
      editor.CodeMirror.setValue(data.content);
    }
  }
}

// 添加事件监听器
window.addEventListener('message', handleMessage);
