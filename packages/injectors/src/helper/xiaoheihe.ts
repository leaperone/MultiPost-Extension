import { createdInputs } from "../helper";
import { waitForElement } from "./common";

let isProcessingVideo = false;

function getLatestFileInput(): HTMLInputElement | undefined {
  for (let index = createdInputs.length - 1; index >= 0; index--) {
    const input = createdInputs[index];
    if (input.type === "file") return input;
  }
  return undefined;
}

export async function handleXiaoheiheVideoUpload(event: MessageEvent) {
  if (isProcessingVideo) {
    return;
  }
  isProcessingVideo = true;
  try {
    const video = event.data.video;
    if (!(video instanceof File) || !video.type.startsWith("video/")) {
      console.error("未找到视频");
      return;
    }

    const uploadVideoButton = await waitForElement('button[class="video-uploader__unload"]');
    (uploadVideoButton as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 500));

    const uploadInput = getLatestFileInput();
    if (!uploadInput) {
      console.error("未找到上传输入框");
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(video);
    uploadInput.files = dataTransfer.files;
    uploadInput.disabled = true;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    uploadInput.disabled = false;
    uploadInput.dispatchEvent(new Event("change", { bubbles: true }));
  } finally {
    isProcessingVideo = false;
  }
}

let isProcessingImage = false;

export async function handleXiaoheiheImageUpload(event: MessageEvent) {
  if (isProcessingImage) {
    return;
  }
  isProcessingImage = true;
  try {
    const images = Array.isArray(event.data.images)
      ? event.data.images.filter(
          (image: unknown): image is File => image instanceof File && image.type.startsWith("image/"),
        )
      : [];

    if (images.length === 0) {
      console.error("未找到图片");
      return;
    }

    const uploadButton = (await waitForElement("div.editor-image-wrapper__box.upload, div.upload")) as HTMLElement;
    uploadButton.click();

    await new Promise((resolve) => setTimeout(resolve, 500));

    const uploadInput = getLatestFileInput();
    if (!uploadInput) {
      console.error("未找到上传输入框");
      return;
    }

    const dataTransfer = new DataTransfer();
    images.forEach((image) => dataTransfer.items.add(image));
    uploadInput.files = dataTransfer.files;
    uploadInput.disabled = true;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    uploadInput.disabled = false;
    uploadInput.dispatchEvent(new Event("change", { bubbles: true }));
  } finally {
    isProcessingImage = false;
  }
}
