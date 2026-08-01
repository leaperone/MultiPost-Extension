interface PendingVideoUpload {
  requestId: string | undefined;
  files: File[];
  isAssigning: boolean;
}

let pendingUpload: PendingVideoUpload | null = null;

function isWeiboVideoPage(): boolean {
  return location.hostname === "weibo.com" && location.pathname.startsWith("/upload/channel");
}

function postResult(requestId: string | undefined, success: boolean, error?: string): void {
  window.postMessage(
    {
      type: "WEIBO_UPLOAD_VIDEO_RESULT",
      requestId,
      success,
      error,
    },
    "*",
  );
}

export function prepareWeiboVideoInput(input: HTMLInputElement): void {
  if (!isWeiboVideoPage()) return;

  const originalClick = input.click.bind(input);
  input.click = () => {
    const isVideoInput = input.type === "file" && /video|mp4|mov|webm/i.test(input.accept || "");
    if (!isVideoInput || !pendingUpload?.files.length) {
      originalClick();
      return;
    }

    const upload = pendingUpload;
    if (upload.isAssigning) return;
    upload.isAssigning = true;

    setTimeout(() => {
      if (pendingUpload !== upload) return;

      try {
        const dataTransfer = new DataTransfer();
        upload.files.forEach((file) => dataTransfer.items.add(file));
        input.files = dataTransfer.files;

        if (input.files?.length !== upload.files.length) {
          throw new Error("视频文件未写入上传控件");
        }

        input.dispatchEvent(new Event("change", { bubbles: true }));
        if (pendingUpload === upload) pendingUpload = null;
        postResult(upload.requestId, true);
      } catch (error) {
        if (pendingUpload === upload) pendingUpload = null;
        const message = error instanceof Error ? error.message : String(error);
        postResult(upload.requestId, false, `视频文件写入失败: ${message}`);
      }
    }, 0);
  };
}

export async function handleWeiboVideoUpload(event: MessageEvent): Promise<void> {
  if (!isWeiboVideoPage()) return;

  const requestId = typeof event.data.requestId === "string" ? event.data.requestId : undefined;
  const files = Array.isArray(event.data.files)
    ? event.data.files.filter((file: unknown): file is File => file instanceof File && file.type.startsWith("video/"))
    : [];

  if (files.length === 0) {
    postResult(requestId, false, "没有可上传的视频文件");
    return;
  }

  if (pendingUpload) {
    const replacedUpload = pendingUpload;
    pendingUpload = null;
    postResult(replacedUpload.requestId, false, "新的视频上传请求已替换当前请求");
  }

  const upload: PendingVideoUpload = {
    requestId,
    files: files.slice(0, 1),
    isAssigning: false,
  };
  pendingUpload = upload;

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const uploadButton = document.querySelector<HTMLButtonElement>("button[id^='video_button_upload_']");
      if (uploadButton) {
        const eventOptions = { bubbles: true, cancelable: true, view: window };
        uploadButton.dispatchEvent(new MouseEvent("mousedown", eventOptions));
        uploadButton.dispatchEvent(new MouseEvent("mouseup", eventOptions));
        uploadButton.dispatchEvent(new MouseEvent("click", eventOptions));
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (pendingUpload !== upload) return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    if (pendingUpload !== upload) return;
    pendingUpload = null;
    const message = error instanceof Error ? error.message : String(error);
    postResult(requestId, false, `触发视频上传控件失败: ${message}`);
    return;
  }

  if (pendingUpload === upload) {
    pendingUpload = null;
    postResult(requestId, false, "未能触发微博视频上传控件");
  }
}
