/* eslint-disable prefer-const */

export {};
import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://weibo.com/upload/channel*'],
  world: 'MAIN',
  run_at: 'document_start',
};

let originalCreateElement = document.createElement.bind(document);
let createdInputs: HTMLInputElement[] = [];

document.createElement = function (tagName, options) {
  let element = originalCreateElement(tagName, options);
  if (tagName.toLowerCase() === 'input') {
    createdInputs.push(element);
    console.log('createdInputs', element);
  }
  return element;
};

interface UploadMessage {
  type: string;
  video: File;
}

async function findElementByText(
  selector: string,
  text: string,
  maxRetries = 5,
  retryInterval = 1000,
): Promise<Element | null> {
  for (let i = 0; i < maxRetries; i++) {
    const elements = document.querySelectorAll(selector);
    const element = Array.from(elements).find((element) => element.textContent?.includes(text));

    if (element) {
      return element;
    }

    console.log(`未找到包含文本 "${text}" 的元素，尝试次数：${i + 1}`);
    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }

  console.error(`在 ${maxRetries} 次尝试后未找到包含文本 "${text}" 的元素`);
  return null;
}

async function handleVideoUpload(event: MessageEvent) {
  const { data } = event as { data: UploadMessage };
  if (data.type !== 'WEIBO_VIDEO_UPLOAD') return;

  window.removeEventListener('message', handleVideoUpload);

  const video = data.video;

  const uploadVideoButton = await findElementByText('span', '上传视频');
  if (!uploadVideoButton) {
    return;
  }

  (uploadVideoButton as HTMLElement).click();
  await new Promise((resolve) => setTimeout(resolve, 500));

  const uploadInput = createdInputs.find((input) => input.type === 'file' && input.id === '_ef');
  if (!uploadInput) {
    console.error('未找到上传输入框');
    return;
  }

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(video);
  uploadInput.files = dataTransfer.files;

  uploadInput.disabled = true;

  await new Promise((resolve) => setTimeout(resolve, 1000));

  uploadInput.disabled = false;
  uploadInput.dispatchEvent(new Event('change', { bubbles: true }));
}

window.addEventListener('message', handleVideoUpload);
