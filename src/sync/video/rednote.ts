import type { FileData, SyncData, VideoData } from "../common";
import type { CoverImageSource, CoverMaterial, CoverUploadResult, SavedCoverPreview } from "./cover-types";

export async function VideoRednote(data: SyncData) {
  const { content, video, title, tags, cover, scheduledPublishTime } = data.data as VideoData;

  // 辅助函数：等待元素出现
  function waitForElement(selector: string, timeout = 10000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  // 辅助函数：上传文件
  async function uploadVideo() {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    if (!fileInput) {
      console.error("未找到文件输入元素");
      return;
    }

    const dataTransfer = new DataTransfer();

    if (video) {
      try {
        const response = await fetch(video.url);
        if (!response.ok) {
          throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        const blob = await response.blob();
        const file = new File([blob], video.name, { type: video.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error(`上传视频 ${video.url} 失败:`, error);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待文件处理
      console.log("文件上传操作完成");
    } else {
      console.error("没有成功添加任何文件");
    }
  }

  /**
   * 设置定时发布时间
   * @param scheduledPublishTime - 定时发布时间戳（毫秒）
   */
  async function setScheduledPublishTime(scheduledPublishTime: number): Promise<void> {
    const labels = document.querySelectorAll("label");
    console.debug("labels -->", labels);

    const scheduledLabel = Array.from(labels).find((label) => label.textContent?.includes("定时发布"));
    console.debug("label -->", scheduledLabel);

    if (scheduledLabel) {
      (scheduledLabel as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const publishTimeInput = document.querySelector('input[placeholder="选择日期和时间"]') as HTMLInputElement;
    console.debug("publishTimeInput -->", publishTimeInput);

    if (publishTimeInput) {
      // 计算时间：添加 8 小时（28800000 毫秒）以调整时区
      const adjustedTime = new Date(scheduledPublishTime + 28800000);
      const formattedTime = adjustedTime.toISOString().slice(0, 16).replace("T", " ");

      publishTimeInput.focus();
      await new Promise((resolve) => setTimeout(resolve, 100));

      publishTimeInput.value = formattedTime;
      publishTimeInput.dispatchEvent(new Event("input", { bubbles: true }));
      publishTimeInput.dispatchEvent(new Event("change", { bubbles: true }));
      publishTimeInput.blur();

      console.debug("定时发布时间已设置:", formattedTime);
    }
  }

  async function uploadCovers(covers: Pick<VideoData, "cover" | "verticalCover" | "horizontalCover">) {
    const platform = "rednote";
    const request = { data: covers };
    const result: CoverUploadResult = { version: 1, status: "failed", mutationStarted: false, slots: [], stages: [] };
    const visible = <T extends Element>(e: T | null | undefined): e is T =>
      !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
    const all = <T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] =>
      Array.from(root.querySelectorAll<T>(selector));
    const text = (e: Element | null | undefined): string => (e?.textContent || "").trim();
    const exact = (root: ParentNode, label: string): HTMLElement | undefined =>
      all(root, "button,span,div")
        .filter(visible)
        .find(
          (e) =>
            text(e) === label && !all(e, "button,span,div").some((child) => visible(child) && text(child) === label),
        );
    const wait = async <T>(
      check: () => T | Promise<T>,
      label: string,
      ms = 20000,
    ): Promise<Exclude<NonNullable<T>, false>> => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        const value = await check();
        if (value) return value as Exclude<NonNullable<T>, false>;
        await new Promise<void>((resolve) => setTimeout(resolve, 200));
      }
      throw Error(`\u7B49\u5F85\u8D85\u65F6\uFF1A${label}`);
    };
    const enabled = (e: HTMLElement | null | undefined): e is HTMLElement =>
      visible(e) && !(e as HTMLButtonElement).disabled && e.getAttribute("aria-disabled") !== "true";
    const click = (e: HTMLElement | null | undefined): void => {
      const control = e?.closest<HTMLElement>('button,[role="button"],a[href],input,.button,.cover-empty-pill') || e;
      if (!enabled(e) || !enabled(control) || e.closest('[disabled],[aria-disabled="true"]'))
        throw Error("\u5C01\u9762\u63A7\u4EF6\u4E0D\u53EF\u7528");
      control.click();
    };
    const root: ParentNode = document;
    const stamp = (stage: string, ratio?: string): number =>
      result.stages.push({ stage, ratio, at: new Date().toISOString() });
    const media = () =>
      all<HTMLVideoElement>(root, "video").find(
        (e) => e.readyState >= 2 && Number.isFinite(e.duration) && e.duration > 0,
      );
    const imageSource = (element: HTMLElement | null | undefined): CoverImageSource | null => {
      if (!element) return null;
      for (const node of [element, ...all(element, "img,[style]")]) {
        if (node.tagName === "IMG") {
          const img = node as HTMLImageElement;
          if (img.complete && img.naturalWidth && /^https:/.test(img.currentSrc || img.src))
            return { url: img.currentSrc || img.src, width: img.naturalWidth, height: img.naturalHeight };
        }
        const match = (node.style.backgroundImage || "").match(/url\(["']?(https:\/\/[^"')]+)["']?\)/);
        if (match) return { url: match[1] };
      }
      return null;
    };
    const signature = (root: ParentNode): string =>
      all(root, "img,canvas,[style]")
        .map((node) => {
          if (node.tagName === "IMG") {
            const image = node as HTMLImageElement;
            return image.currentSrc || image.src;
          }
          if (node.tagName === "CANVAS") {
            try {
              return (node as HTMLCanvasElement).toDataURL();
            } catch {
              return "";
            }
          }
          return node.style.backgroundImage || "";
        })
        .join("|");
    async function material(file: FileData, ratio: string): Promise<CoverMaterial> {
      if (!file?.url) throw Error(`缺少${ratio}封面`);
      const response = await fetch(file.url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error(`封面读取HTTP ${response.status}`);
      const responseType = response.headers.get("content-type")?.split(";")[0];
      const mime = responseType?.startsWith("image/") ? responseType : file.type;
      if (!mime?.startsWith("image/")) throw Error("Cover response is not an image");
      const bytes = await response.arrayBuffer();
      const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
      const blob = new Blob([bytes], { type: mime });
      const bitmap = await createImageBitmap(blob);
      bitmap.close();
      return { file: new File([blob], file.name, { type: mime }), sha256 };
    }
    async function change(
      input: HTMLInputElement,
      image: CoverMaterial,
      editor: ParentNode,
      ratio: string,
    ): Promise<void> {
      if (!input || input.type !== "file" || !input.accept.includes("image")) throw Error("没有当前封面图片input");
      const before = signature(editor);
      const dt = new DataTransfer();
      dt.items.add(image.file);
      result.mutationStarted = true;
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      stamp("input_changed", ratio);
      await wait(() => {
        const after = signature(editor);
        return after && after !== before;
      }, "图片裁剪更新");
      stamp("crop_preview_changed", ratio);
    }
    async function saved(area: () => HTMLElement | null, ratio: string, before?: string): Promise<SavedCoverPreview> {
      const source = await wait(() => {
        const v = imageSource(area());
        return v && v.url !== before ? v : null;
      }, `${ratio}保存后的封面`);
      if (!source.width || !source.height) {
        const img = new Image();
        img.src = source.url;
        await img.decode();
        source.width = img.naturalWidth;
        source.height = img.naturalHeight;
      }
      if (ratio.includes("x")) {
        const [w, h] = ratio.split("x").map(Number);
        if (Math.abs(source.width / source.height - w / h) > 0.015) throw Error(`Saved cover ratio mismatch: ${ratio}`);
      }
      return { ratio, width: source.width, height: source.height, previewUrl: source.url, saved: true };
    }
    if (!covers.cover) return { ...result, status: "skipped" };
    try {
      const host = { rednote: "creator.xiaohongshu.com", weixinchannel: "channels.weixin.qq.com" }[platform];
      if (location.hostname !== host) throw Error("Unexpected cover upload origin");
      const player = await wait(media, "已上传视频就绪", 60000);
      const videoSrc = player.currentSrc || player.src;
      const duration = player.duration;
      stamp("draft_verified");
      const verify = () => {
        const p = media();
        if (!p || (p.currentSrc || p.src) !== videoSrc || Math.abs(p.duration - duration) > 1)
          throw Error("已上传视频身份变化");
      };
      const image = await material(request.data.cover, "cover");
      const area = () => root.querySelector<HTMLElement>(".default.row");
      const previous = imageSource(area())?.url;
      const oldEntry = root.querySelector<HTMLElement>("div.noCover.uploadCover");
      if (visible(oldEntry)) click(oldEntry);
      else {
        const card = area();
        const entry = card?.querySelector<HTMLElement>(".cover-edit-entry-text");
        if (!visible(card) || text(entry) !== "编辑封面") throw Error("没有可见封面卡片内的编辑封面控件");
        entry.click();
      }
      const editor = await wait(() => {
        const modern = root.querySelector<HTMLElement>(".main-cover-editor-modal");
        if (visible(modern)) return modern;
        for (const input of all<HTMLInputElement>(root, "input[type=file][accept*=image]")) {
          let p = input.parentElement;
          while (p && p !== document.body) {
            if (visible(p) && exact(p, "完成") && p.querySelector<HTMLImageElement>("img,canvas")) return p;
            p = p.parentElement;
          }
        }
        return null;
      }, "小红书设置封面窗口");
      const edit = all<HTMLButtonElement>(editor, "button.video-panel-switch-item").find(
        (e) => visible(e) && text(e) === "编辑",
      );
      if (edit) click(edit);
      const readCanvas = () => {
        const canvases = all<HTMLCanvasElement>(editor, "canvas.canvas-gl").filter(visible);
        if (canvases.length !== 1) return null;
        try {
          return canvases[0].toDataURL();
        } catch {
          throw Error("无法读取小红书主画布");
        }
      };
      const mainBefore = editor.matches(".main-cover-editor-modal") ? await wait(readCanvas, "小红书主画布就绪") : null;
      const input: HTMLInputElement = await wait(
        () =>
          editor.querySelector<HTMLInputElement>(".cover-container-video input[type=file][accept*=image]") ||
          editor.querySelector<HTMLInputElement>("input[type=file][accept*=image]"),
        "小红书当前封面图片input",
      );
      await change(input, image, editor, "cover");
      if (editor.matches(".main-cover-editor-modal")) {
        const thumb = await wait(() => {
          const thumbs = all<HTMLButtonElement>(editor, "button.uploaded-thumbnail").filter(visible);
          if (thumbs.length !== 1) return null;
          const img = thumbs[0].querySelector<HTMLImageElement>("img.uploaded-thumbnail-img");
          return img?.complete && img.naturalWidth && img.naturalHeight > 0 ? thumbs[0] : null;
        }, "唯一已上传4:3缩略图解码");
        if (thumb.querySelector<HTMLElement>(".uploaded-thumbnail-inactive-mask"))
          click(thumb.querySelector<HTMLImageElement>("img.uploaded-thumbnail-img"));
        await wait(() => {
          const current = readCanvas();
          return (
            !thumb.querySelector<HTMLElement>(".uploaded-thumbnail-inactive-mask") && current && current !== mainBefore
          );
        }, "已上传封面选中且主画布更新");
        stamp("main_crop_preview_changed", "cover");
      }
      const complete = await wait(
        () => {
          const e = exact(editor, "完成");
          const button = e?.closest?.<HTMLButtonElement>("button") || e;
          return visible(e) &&
            enabled(button) &&
            button.getAttribute?.("aria-disabled") !== "true" &&
            !button.classList?.contains("loading")
            ? e
            : null;
        },
        "小红书完成按钮可用",
        45000,
      );
      click(complete);
      stamp("complete_clicked", "cover");
      await wait(() => !editor.isConnected || !visible(editor), "小红书封面保存", 45000);
      verify();
      result.slots.push({ ...(await saved(area, "cover", previous)), sha256: image.sha256 });
      verify();
      result.status = "saved";
      stamp("all_slots_saved");
    } catch (error) {
      result.status = result.mutationStarted ? "needs_attention" : "failed";
      result.error = String(error?.message || error);
    }
    console.info(
      "[MultiPost covers]",
      JSON.stringify({
        status: result.status,
        slots: result.slots.map(({ ratio, width, height }) => ({ ratio, width, height })),
        error: result.error,
      }),
    );
    return result;
  }

  // 等待页面加载
  await waitForElement('span[class="title"]');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 上传视频
  await uploadVideo();

  // 填写内容
  // 等待标题输入框出现
  await waitForElement('input[type="text"]');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 填写标题
  const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
  if (titleInput) {
    const finalTitle = title?.slice(0, 20) || "";
    titleInput.value = finalTitle;
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // 填写内容和标签
  const editor = document.querySelector('div[contenteditable="true"]') as HTMLElement;
  if (!editor) {
    console.error("未找到编辑器元素");
    return;
  }

  // 填写正文内容
  editor.focus();
  const contentPasteEvent = new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer(),
  });
  contentPasteEvent.clipboardData.setData("text/plain", `${content}\n` || "");
  editor.dispatchEvent(contentPasteEvent);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  editor.blur();

  // 添加标签
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      editor.focus();
      const tagPasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      tagPasteEvent.clipboardData.setData("text/plain", `#${tag}`);
      editor.dispatchEvent(tagPasteEvent);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 模拟回车键按下以确认标签
      const enterEvent = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
      });
      editor.dispatchEvent(enterEvent);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // 上传封面
  if (cover) {
    await uploadCovers({ cover });
  }

  // 处理定时发布
  if (scheduledPublishTime) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await setScheduledPublishTime(scheduledPublishTime);
  }

  if (data.isAutoPublish === true) {
    // 轮询期间重新查询按钮，避免页面重渲染后持有失效节点；视频处理较慢，最多约 60s
    const findPublishButton = () =>
      Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("发布"));

    let publishButton = findPublishButton();
    for (let i = 0; i < 60; i++) {
      publishButton = findPublishButton();
      if (publishButton && publishButton.getAttribute("aria-disabled") !== "true") break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (publishButton && publishButton.getAttribute("aria-disabled") !== "true") {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      window.location.href = "https://creator.xiaohongshu.com/new/note-manager";
    } else {
      console.debug("小红书：发布按钮仍不可用，跳过自动发布");
    }
  }
}
