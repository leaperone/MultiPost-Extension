import { waitForElement } from './common';
import { createdInputs } from '~contents/helper';

let isProcessingImage = false;

export async function handleBilibiliImageUpload(event: MessageEvent) {
  if (isProcessingImage) {
    return;
  }
  isProcessingImage = true;
  const files = event.data.files;

  await waitForElement('.bili-dyn-publishing__image-upload');

  const uploadInput = createdInputs.find((input) => input.type === 'file' && input.name === 'upload');
  if (!uploadInput) {
    return;
  }

  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  uploadInput.files = dataTransfer.files;

  const addButton = document.querySelector('.bili-pics-uploader__add');

  uploadInput.disabled = true;
  addButton?.dispatchEvent(new Event('click', { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  uploadInput.disabled = false;
  uploadInput.dispatchEvent(new Event('change', { bubbles: true }));

  isProcessingImage = false;
}
