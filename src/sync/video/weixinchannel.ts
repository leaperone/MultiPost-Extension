/**
 * @file 微信视频号发布同步功能
 * @description 处理视频同步发布到微信视频号，支持wujie微前端框架的shadow DOM环境
 * @author Chrome Extension Team
 * @date 2024-01-01
 */

import type { FileData, SyncData, VideoData } from "../common";
import type { CoverImageSource, CoverMaterial, CoverUploadResult, SavedCoverPreview } from "./cover-types";

/**
 * 微信视频号视频发布处理函数
 * @description 自动化填写视频标题、描述、标签，上传视频文件，处理原创声明和发布操作
 * @param data - 同步数据，包含视频信息和发布配置
 * @throws {Error} 当查找关键元素失败或发布过程出错时抛出错误
 */
export async function VideoWeiXinChannel(data: SyncData) {
  /**
   * Format date to yyyy-MM-dd HH:mm format
   * @param date - Date object to format
   * @returns Formatted date string
   */
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * 解析视频号所在的根节点（视频号运行在 wujie 微前端的 shadow DOM 内）
   * @returns wujie-app 的 shadowRoot；若不存在则回退到 document
   */
  function getRoot(): Document | ShadowRoot {
    const wujieApp = document.querySelector("wujie-app");
    return wujieApp?.shadowRoot || document;
  }

  /**
   * 等待元素出现，支持Shadow DOM查询
   * @param selector - CSS选择器
   * @param timeout - 超时时间（毫秒）
   * @returns Promise<Element> 找到的元素
   */
  function waitForElement(selector: string, timeout = 10000): Promise<Element> {
    return new Promise((resolve, reject) => {
      /**
       * 在指定根节点下查找元素，支持Shadow DOM
       * @param root - 根节点
       * @returns Element | null 找到的元素或null
       */
      function findElementInRoot(root: Document | DocumentFragment | ShadowRoot): Element | null {
        // 先在当前根节点下查找
        const element = root.querySelector(selector);
        if (element) return element;

        // 查找所有可能包含shadow-root的元素
        const allElements = root.querySelectorAll("*");
        for (const el of allElements) {
          if (el.shadowRoot) {
            const found = findElementInRoot(el.shadowRoot);
            if (found) return found;
          }
        }

        return null;
      }

      /**
       * 查找wujie-app的shadow-root并在其中搜索元素
       * @returns Element | null 找到的元素或null
       */
      function findInWujieApp(): Element | null {
        // 查找wujie-app元素
        const wujieApp = document.querySelector("wujie-app");

        if (wujieApp?.shadowRoot) {
          const element = wujieApp.shadowRoot.querySelector(selector);

          if (element) {
            return element;
          }

          // 如果直接查找失败，尝试递归查找
          return findElementInRoot(wujieApp.shadowRoot);
        }

        // 如果没有找到wujie-app，尝试在整个文档中查找
        return findElementInRoot(document);
      }

      // 首次查找
      const element = findInWujieApp();
      if (element) {
        resolve(element);
        return;
      }

      // 设置MutationObserver监听DOM变化
      const observer = new MutationObserver(() => {
        const element = findInWujieApp();
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      });

      // 观察整个document的变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // 特别处理wujie-app的shadow-root
      const checkWujieApp = () => {
        const wujieApp = document.querySelector("wujie-app");
        if (wujieApp?.shadowRoot) {
          const shadowObserver = new MutationObserver(() => {
            const element = wujieApp.shadowRoot!.querySelector(selector);
            if (element) {
              resolve(element);
              observer.disconnect();
              shadowObserver.disconnect();
            }
          });

          shadowObserver.observe(wujieApp.shadowRoot, {
            childList: true,
            subtree: true,
          });

          // 超时时也要断开shadow observer
          setTimeout(() => {
            shadowObserver.disconnect();
          }, timeout);
        }
      };

      // 立即检查一次
      checkWujieApp();

      // 定期重新检查wujie-app（防止wujie-app后加载）
      const intervalCheck = setInterval(() => {
        const element = findInWujieApp();
        if (element) {
          resolve(element);
          observer.disconnect();
          clearInterval(intervalCheck);
        }
      }, 1000);

      // 设置超时
      setTimeout(() => {
        observer.disconnect();
        clearInterval(intervalCheck);
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * 等待元素出现但不抛错：超时返回 null，避免单个字段缺失中断整个发布流程
   * @param selector - CSS选择器
   * @param timeout - 超时时间（毫秒）
   */
  async function waitForElementOptional(selector: string, timeout = 8000): Promise<Element | null> {
    return waitForElement(selector, timeout).catch(() => null);
  }

  /**
   * 上传视频文件
   * @param file - 视频文件
   */
  async function uploadVideo(file: File): Promise<void> {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发文件选择变化事件
    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);
    const inputEvent = new Event("input", { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log("视频上传事件已触发");
  }

  /**
   * 设置定时发布时间
   * @param scheduledPublishTime - 定时发布时间戳（毫秒）
   * @param root - 根节点（Document 或 ShadowRoot），用于查询元素
   */
  async function setScheduledPublishTime(
    scheduledPublishTime: number,
    root: Document | ShadowRoot = document,
  ): Promise<void> {
    try {
      const labels = root.querySelectorAll("label");
      console.debug("labels -->", labels);

      const scheduledLabel = Array.from(labels).find((label) => {
        console.debug("label -->", label.textContent);
        return label.textContent?.trim() === "定时";
      });

      console.debug("scheduledLabel -->", scheduledLabel);

      if (scheduledLabel) {
        (scheduledLabel as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const publishTimeInput = root.querySelector('input[placeholder="请选择发表时间"]') as HTMLInputElement;

      console.debug("publishTimeInput -->", publishTimeInput);

      if (publishTimeInput) {
        // 阻止事件冒泡的处理函数
        const stopEvent = (e: Event) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
        };

        // 需要阻止的事件类型
        const eventTypes = ["input", "change", "blur", "focus", "keydown", "keyup"];

        // 添加事件监听器以阻止事件
        eventTypes.forEach((eventType) => {
          publishTimeInput.addEventListener(eventType, stopEvent, { capture: true });
        });

        try {
          // 移除 readonly 属性
          publishTimeInput.removeAttribute("readonly");

          // 格式化时间
          const formattedTime = formatDate(new Date(scheduledPublishTime));

          // 设置时间值（多种方式确保生效）
          publishTimeInput.value = formattedTime;
          publishTimeInput.setAttribute("value", formattedTime);
          publishTimeInput.defaultValue = formattedTime;
          publishTimeInput.setAttribute("data-value", formattedTime);

          console.debug("设置时间值:", formattedTime, "当前值:", publishTimeInput.value);
        } finally {
          // 延迟移除事件监听器
          setTimeout(() => {
            eventTypes.forEach((eventType) => {
              publishTimeInput.removeEventListener(eventType, stopEvent, { capture: true });
            });
          }, 200);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 触发 change 和 input 事件
          publishTimeInput.dispatchEvent(new Event("change", { bubbles: true }));
          publishTimeInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } catch (error) {
      console.error("setScheduledPublishTime failed:", error);
    }
  }

  async function uploadCovers(covers: Pick<VideoData, "cover" | "verticalCover" | "horizontalCover">) {
    const platform = "weixinchannel";
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
    const root: ParentNode = document.querySelector<HTMLElement>("wujie-app")?.shadowRoot || document;
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
    if (!covers.cover && !covers.verticalCover && !covers.horizontalCover) return { ...result, status: "skipped" };
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
      const items = [
        {
          ratio: "3x4",
          file: request.data.verticalCover || request.data.cover,
          area: () => root.querySelector<HTMLElement>(".vertical-cover-wrap"),
          entry: () => root.querySelector<HTMLElement>(".vertical-cover-wrap"),
        },
        {
          ratio: "4x3",
          file: request.data.cover || request.data.horizontalCover,
          area: () => root.querySelector<HTMLElement>(".horizon-img-wrap"),
          entry: () => root.querySelector<HTMLElement>(".horizon-img-wrap .edit-btn"),
        },
      ];
      for (const item of items.filter((item) => item.file)) {
        verify();
        const image = await material(item.file, item.ratio);
        const previous = imageSource(item.area())?.url;
        click(item.entry());
        const direct = await wait(
          () => exact(root, "直接编辑") || all(root, ".cover-control-wrap").find(visible),
          "视频号封面窗口",
        );
        if (text(direct) === "直接编辑") click(direct);
        const editor = await wait(() => all(root, ".cover-control-wrap").find(visible), "视频号当前封面编辑器");
        const input: HTMLInputElement = await wait(
          () => editor.querySelector<HTMLInputElement>("input[type=file][accept*=image]"),
          "视频号图片input",
        );
        await change(input, image, editor, item.ratio);
        const confirm = await wait(
          () =>
            all<HTMLButtonElement>(root, ".finder-dialog-footer button").find(
              (e) => visible(e) && text(e) === "确认" && !e.disabled,
            ),
          "视频号确认按钮",
        );
        click(confirm);
        await wait(() => !visible(editor), "视频号封面保存");
        verify();
        result.slots.push({ ...(await saved(item.area, item.ratio, previous)), sha256: image.sha256 });
      }
      for (const item of items.filter((item) => item.file)) {
        const final = await saved(item.area, item.ratio, "");
        if (final.previewUrl !== result.slots.find((s) => s.ratio === item.ratio).previewUrl)
          throw Error("保存第二槽后第一槽改变");
      }
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

  try {
    const {
      content,
      video,
      title,
      tags = [],
      cover,
      horizontalCover,
      verticalCover,
      description,
      scheduledPublishTime,
    } = data.data as VideoData;

    // 等待 wujie-app 与文件输入框就绪，再解析一次根节点（后续字段统一从该根节点同步查询，）
    await waitForElement('input[type="file"]');
    const root = getRoot();

    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      await uploadVideo(videoFile);
      console.log("视频上传已初始化");
    }

    // 等待视频上传完成、标题/描述表单渲染出来
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理标题输入（找不到不报错，避免中断后续字段填充）
    const titleInput = (await waitForElementOptional(
      'input[placeholder="填写短标题有机会获得更多流量"], input[placeholder="概括视频主要内容，字数建议6-16个字符"]',
    )) as HTMLInputElement | null;
    if (titleInput) {
      titleInput.value = title || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("标题已填写:", title);
    } else {
      console.error("未找到视频号标题输入框");
    }

    // 处理内容和标签输入
    const descriptionInput = (await waitForElementOptional(
      'div[data-placeholder="添加描述"]',
    )) as HTMLDivElement | null;

    if (descriptionInput) {
      // 输入主要内容（content 优先，回退 description）
      descriptionInput.focus();
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData.setData("text/plain", content || description || "");
      descriptionInput.dispatchEvent(pasteEvent);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // 添加标签
      for (const tag of tags) {
        console.log("添加标签:", tag);
        descriptionInput.focus();

        const tagPasteEvent = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer(),
        });
        tagPasteEvent.clipboardData.setData("text/plain", ` #${tag}`);
        descriptionInput.dispatchEvent(tagPasteEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const enterEvent = new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
        });
        descriptionInput.dispatchEvent(enterEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } else {
      console.error("未找到视频号描述输入框");
    }

    // 处理原创声明（：先勾选，再在声明弹窗内勾选并点「声明原创」）
    const originalInput = root.querySelector(
      'input[type="checkbox"][class="ant-checkbox-input"]',
    ) as HTMLInputElement | null;

    if (originalInput) {
      originalInput.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const declareInput = root.querySelector(
        'div.declare-body-wrapper input[type="checkbox"][class="ant-checkbox-input"]',
      ) as HTMLInputElement | null;

      if (declareInput) {
        declareInput.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const buttons = root.querySelectorAll('button[type="button"]');
        for (const button of Array.from(buttons)) {
          if (button.textContent === "声明原创") {
            console.log("点击声明原创按钮");
            (button as HTMLElement).click();
            await new Promise((resolve) => setTimeout(resolve, 1000));
            break;
          }
        }
      }
    }

    // 处理定时发布
    if (scheduledPublishTime) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await setScheduledPublishTime(scheduledPublishTime, root);
    }

    // 处理封面：，竖封面 + 横封面分别上传
    await uploadCovers({ cover, verticalCover, horizontalCover });

    if (data.isAutoPublish === true) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 处理发布按钮 - 支持shadow DOM查询
      const buttons = root.querySelectorAll("button");
      const publishButton = Array.from(buttons).find((b) => b.textContent?.trim() === "发表") as HTMLButtonElement;

      console.debug("sendButton", publishButton);

      if (publishButton) {
        console.debug("sendButton clicked");
        publishButton.click();
      } else {
        console.error('未找到"发表"按钮');
      }
    }
  } catch (error) {
    console.error("WeiXinVideo 发布过程中出错:", error);
  }
}
