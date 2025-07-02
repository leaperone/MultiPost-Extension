import { createdInputs } from '../helper';
import { waitForElement } from './common';

let isProcessingVideo = false;

export async function handleXiaoheiheVideoUpload(event: MessageEvent) {
  if (isProcessingVideo) {
    return;
  }
  isProcessingVideo = true;
  const video = event.data.video;
  if (!video) {
    console.error('未找到视频');
    return;
  }

  const uploadVideoButton = await waitForElement('button[class="video-uploader__unload"]');
  if (!uploadVideoButton) {
    console.error('未找到上传视频按钮');
    return;
  }

  (uploadVideoButton as HTMLElement).click();
  await new Promise((resolve) => setTimeout(resolve, 500));

  const uploadInput = createdInputs.find((input) => input.type === 'file');
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

  isProcessingVideo = false;
}

let isProcessingImage = false;

export async function handleXiaoheiheImageUpload(event: MessageEvent) {
  if (isProcessingImage) {
    return;
  }
  isProcessingImage = true;
  const images = event.data.images;

  if (!images || images.length === 0) {
    console.error('未找到图片');
    return;
  }

  const uploadButton = (await waitForElement('div.upload')) as HTMLElement;
  if (!uploadButton) {
    console.error('未找到上传按钮');
    return;
  }

  uploadButton.click();

  await new Promise((resolve) => setTimeout(resolve, 500));

  const uploadInput = createdInputs.find((input) => input.type === 'file');
  if (!uploadInput) {
    console.error('未找到上传输入框');
    return;
  }

  const dataTransfer = new DataTransfer();
  images.forEach((image) => {
    dataTransfer.items.add(image);
  });
  uploadInput.files = dataTransfer.files;

  uploadInput.disabled = true;

  await new Promise((resolve) => setTimeout(resolve, 1000));

  uploadInput.disabled = false;
  uploadInput.dispatchEvent(new Event('change', { bubbles: true }));

  isProcessingImage = false;
}
