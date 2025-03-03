import { createdInputs } from '~contents/helper';
import { findElementByText } from './common';

let isProcessingVideo = false;

export async function handleWeiboVideoUpload(event: MessageEvent) {
  if (isProcessingVideo) {
    return;
  }
  isProcessingVideo = true;

  const video = event.data.video;

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

  isProcessingVideo = false;
}
