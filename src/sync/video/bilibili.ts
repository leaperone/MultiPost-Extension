import type { FileData, SyncData, VideoData } from "../common";
import type {
  CoverImageSource,
  CoverMaterial,
  CoverUploadResult,
  CroppedCoverPreview,
  MissingVideoIdentity,
  ReadyVideoIdentity,
  SavedImagePreview,
  VideoIdentity,
} from "./cover-types";

export async function VideoBilibili(data: SyncData) {
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

  async function waitForElementOptional(selector: string, timeout = 10000): Promise<Element | null> {
    return waitForElement(selector, timeout).catch(() => null);
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function applyOriginalDeclaration(isOriginal: boolean): void {
    const originalCheckbox = document.querySelector(
      "div.original-input-wrp input[type='checkbox']",
    ) as HTMLInputElement | null;
    if (originalCheckbox) {
      if (isOriginal && !originalCheckbox.checked) {
        originalCheckbox.click();
        console.log("已勾选原创声明");
      } else if (!isOriginal && originalCheckbox.checked) {
        originalCheckbox.click();
        console.log("已取消原创声明");
      }
      return;
    }

    const radioLabels = isOriginal ? ["自制"] : ["转载", "非自制"];
    const originalRadio = Array.from(document.querySelectorAll<HTMLElement>("span.check-radio-v2-name")).find((span) =>
      radioLabels.some((label) => span.textContent?.trim() === label || span.textContent?.includes(label)),
    );
    if (originalRadio) {
      originalRadio.click();
      console.log(isOriginal ? "已选择自制原创声明" : "已选择转载原创声明");
    } else {
      console.log(isOriginal ? "未找到自制原创声明单选项" : "未找到转载原创声明单选项");
    }
  }

  async function uploadCovers(covers: Pick<VideoData, "cover" | "verticalCover" | "horizontalCover">) {
    const platform = "bilibili";
    const request = { data: covers };
    const result: CoverUploadResult = {
      version: 1,
      status: "needs_attention",
      mutationStarted: false,
      slots: [],
      stages: [],
    };
    const visible = <T extends Element>(e: T | null | undefined): e is T =>
      !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
    const text = (e: Element | null | undefined): string => (e?.textContent || "").trim();
    const all = <T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] =>
      Array.from(root.querySelectorAll<T>(selector));
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
    const exact = (root: ParentNode, labels: string[]): HTMLElement | undefined =>
      all(root, "button,span,div,a")
        .filter(visible)
        .find(
          (e) =>
            labels.includes(text(e)) &&
            !all(e, "button,span,div,a").some((child) => visible(child) && labels.includes(text(child))),
        );
    const enabled = (e: HTMLElement | null | undefined): e is HTMLElement =>
      visible(e) && !(e as HTMLButtonElement).disabled && e.getAttribute("aria-disabled") !== "true";
    const click = (e: HTMLElement | null | undefined): void => {
      const control = e?.closest<HTMLElement>('button,[role="button"],a[href],input,.button,.cover-empty-pill') || e;
      if (!enabled(e) || !enabled(control) || e.closest('[disabled],[aria-disabled="true"]'))
        throw Error("\u5C01\u9762\u63A7\u4EF6\u4E0D\u53EF\u7528");
      e.click();
    };
    const mark = (stage: string, ratio?: string): number =>
      result.stages.push({ stage, ratio, at: new Date().toISOString() });
    const host = "member.bilibili.com";
    const pageUrl = location.href;
    let mediaBefore: ReadyVideoIdentity | undefined = null;
    const inspectMedia = (): VideoIdentity => {
      const missing: MissingVideoIdentity = { videoReady: false };
      {
        const tasks = all(document, ".task[title]").filter(visible);
        const rows = all(document, ".file-item-content-status").filter(visible);
        if (tasks.length || rows.length) {
          if (
            tasks.length !== 1 ||
            !tasks[0].classList.contains("task-selected") ||
            !tasks[0].querySelector<HTMLElement>(".task-status-success") ||
            rows.length !== 1 ||
            text(rows[0]) !== "上传完成"
          )
            return missing;
          const inputs = all<HTMLInputElement>(document, "input[type=file]").filter(
            (e) => e.accept.includes(".mp4") && e.files?.length,
          );
          if (inputs.length !== 1 || inputs[0].files.length !== 1) return missing;
          const file = inputs[0].files[0];
          return { videoReady: true, kind: "file", file, name: file.name, size: file.size, type: file.type };
        }
      }
      const player = all<HTMLVideoElement>(document, "video").find(
        (e) => e.readyState >= 2 && Number.isFinite(e.duration) && e.duration > 0,
      );
      return player
        ? { videoReady: true, kind: "player", src: player.currentSrc || player.src, duration: player.duration }
        : missing;
    };
    const verifyIdentity = async (): Promise<void> => {
      if (location.hostname !== host || location.href !== pageUrl) throw Error("Draft origin or URL changed");
      const current = inspectMedia();
      if (!current.videoReady) {
        throw Error("Draft video is not ready");
      }
      if (mediaBefore) {
        if (current.kind === "file") {
          if (
            mediaBefore.kind !== "file" ||
            current.file !== mediaBefore.file ||
            current.name !== mediaBefore.name ||
            current.size !== mediaBefore.size
          )
            throw Error("Draft video identity changed");
        } else if (
          mediaBefore.kind !== "player" ||
          current.src !== mediaBefore.src ||
          Math.abs(current.duration - mediaBefore.duration) >= 1
        )
          throw Error("Draft video identity changed");
      } else mediaBefore = current;
    };
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
      all(root, "img,canvas")
        .map((node) => {
          if (node.tagName === "IMG") {
            const image = node as HTMLImageElement;
            return `${image.currentSrc || image.src}:${image.naturalWidth}`;
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
    const croppedPreview = async (
      root: ParentNode,
      ratio: string,
      requireRatio = true,
    ): Promise<CroppedCoverPreview | null> => {
      const selector =
        ratio === "4x3" ? ".cover-phone-view-home-video-img img" : ".cover-phone-view-space-video-img img";
      const img = root.querySelector<HTMLImageElement>(selector);
      if (!img?.complete || !img.naturalWidth || !img.naturalHeight) return null;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw Error("Cannot read cropped cover canvas");
      ctx.drawImage(img, 0, 0);
      let pixels: Uint8ClampedArray;
      try {
        pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      } catch {
        throw Error(`\u65E0\u6CD5\u8BFB\u53D6${ratio}\u5B9E\u9645\u88C1\u526A\u9884\u89C8\u50CF\u7D20`);
      }
      const previewSha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", pixels)))
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
      const [w, h] = ratio.split("x").map(Number);
      if (requireRatio && Math.abs(canvas.width / canvas.height - w / h) > 0.015) return null;
      return { previewKind: "cropped_image", previewSha256, width: canvas.width, height: canvas.height };
    };
    const preview = async (root: HTMLElement, ratio: string, before?: string): Promise<SavedImagePreview> => {
      const source = await wait(() => {
        const value = imageSource(root);
        return value && value.url !== before ? value : null;
      }, `${ratio}\u5DF2\u4FDD\u5B58\u56FE\u7247\u53D8\u5316`);
      if (!source.width || !source.height) {
        const img = new Image();
        img.src = source.url;
        await img.decode();
        source.width = img.naturalWidth;
        source.height = img.naturalHeight;
      }
      const [w, h] = ratio.split("x").map(Number);
      if (!source.width || !source.height || Math.abs(source.width / source.height - w / h) > 0.015)
        throw Error(`\u4FDD\u5B58\u540E\u5C01\u9762\u6BD4\u4F8B\u4E0D\u7B26\uFF1A${ratio}`);
      return { previewUrl: source.url, previousPreviewUrl: before || "", width: source.width, height: source.height };
    };
    async function image(file: FileData, ratio: string): Promise<CoverMaterial> {
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
      mark("material_decoded", ratio);
      return { file: new File([blob], file.name, { type: mime }), sha256 };
    }
    async function setImage(
      input: HTMLInputElement,
      material: CoverMaterial,
      root: ParentNode,
      ratio: string,
      readSignature: () => string | null = () => signature(root),
    ): Promise<void> {
      if (!input || input.type !== "file" || !input.accept.includes("image")) throw Error("没有当前编辑器图片输入框");
      const before = readSignature();
      if (!before) throw Error("当前封面编辑画布尚未就绪");
      const transfer = new DataTransfer();
      transfer.items.add(material.file);
      result.mutationStarted = true;
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      mark("input_changed", ratio);
      await wait(() => {
        const after = readSignature();
        return after && after !== before;
      }, "裁剪预览更新");
      mark("crop_preview_changed", ratio);
    }
    const slot = (root, label) => {
      const node = exact(root, [label]);
      if (!node) throw Error(`没有封面槽位：${label}`);
      return node.closest<HTMLElement>(".cover-editor-panel-canvas > div") || node.parentElement;
    };
    const editor = () =>
      all(document, "[role=dialog],.cover-editor,.cover-select-dialog,.cover-select-container,.semi-modal-content")
        .filter(visible)
        .find((e) => e.querySelector<HTMLInputElement>("input[type=file][accept*=image]")) ||
      all<HTMLInputElement>(document, "input[type=file][accept*=image]")
        .map((e) => {
          let p = e.parentElement;
          while (
            p &&
            p !== document.body &&
            p !== document.documentElement &&
            (!p.querySelector<HTMLElement>("canvas,img") || !exact(p, ["完成"]))
          )
            p = p.parentElement;
          return p === document.body || p === document.documentElement ? null : p;
        })
        .find(visible);
    const ratios = ["4x3", "16x9"];
    const labels = ["首页推荐封面（4:3）", "个人空间封面（16:9）"];
    const files = [
      request.data.cover || request.data.horizontalCover,
      request.data.horizontalCover || request.data.cover,
    ];
    if (!files.some(Boolean)) return { ...result, status: "skipped" };
    try {
      if (!["bilibili", "douyin"].includes(platform)) throw Error("不支持的平台");
      await wait(() => inspectMedia().videoReady, "Draft video readiness", 60000);
      await verifyIdentity();
      mark("draft_verified");
      const materials = [];
      for (let i = 0; i < 2; i++) materials.push(await image(files[i], ratios[i]));
      {
        const entry = () =>
          document.querySelector<HTMLElement>("div.cover-main-img > div.img") ||
          exact(document.querySelector<HTMLElement>("div.cover-main") || document, [
            "添加封面",
            "更换封面",
            "封面设置",
          ]);
        let root: HTMLElement = editor();
        if (!root) {
          click(entry());
          root = await wait(editor, "B站封面编辑器");
        }
        const modern = !!root.querySelector<HTMLElement>(".cover-editor-panel-canvas");
        if (modern && root.querySelector<HTMLInputElement>(".sync-checkbox-wrapper input:checked"))
          throw Error("双比例同步已开启，不能分别上传");
        const previousCrops = modern
          ? await Promise.all(ratios.map((ratio) => croppedPreview(root, ratio, false)))
          : [];
        const previousUrls = modern ? [] : labels.map((label) => imageSource(slot(root, label))?.url || "");
        const uploaded = [];
        for (let i = 0; i < 2; i++) {
          const area = slot(root, labels[i]);
          const before = signature(area);
          click(modern ? exact(area, [labels[i]]) : area.querySelector<HTMLElement>("canvas,img") || area);
          const upload = exact(root, ["上传封面", "上传封面图片"]);
          if (!modern && upload) click(upload);
          const input: HTMLInputElement = await wait(
            () => root.querySelector<HTMLInputElement>("input[type=file][accept*=image]"),
            "B站封面图片输入框",
          );
          await setImage(input, materials[i], root, ratios[i]);
          if (modern)
            uploaded[i] = await wait(async () => {
              const value = await croppedPreview(root, ratios[i]);
              return value && value.previewSha256 !== previousCrops[i]?.previewSha256 ? value : null;
            }, `B站${ratios[i]}实际裁剪预览变化`);
          else await wait(() => signature(area) !== before, `B站${ratios[i]}槽位预览变化`);
          mark("slot_preview_changed", ratios[i]);
        }
        await verifyIdentity();
        click(exact(root, ["完成"]));
        await wait(() => !visible(root), "B站封面保存");
        mark("editor_saved");
        click(entry());
        const savedRoot = await wait(editor, "B站保存结果核实");
        for (let i = 0; i < 2; i++) {
          if (modern) {
            const saved = await wait(async () => {
              const value = await croppedPreview(savedRoot, ratios[i]);
              return value && value.previewSha256 === uploaded[i].previewSha256 ? value : null;
            }, `B站${ratios[i]}保存后裁剪预览解码并匹配`);
            if (saved.previewSha256 === previousCrops[i]?.previewSha256)
              throw Error(`重开后${ratios[i]}裁剪结果未改变`);
            result.slots.push({
              ratio: ratios[i],
              slotLabel: labels[i],
              sha256: materials[i].sha256,
              ...saved,
              inputPreviewSha256: uploaded[i].previewSha256,
              previousPreviewSha256: previousCrops[i]?.previewSha256 || "",
              saved: true,
            });
          } else {
            const saved = await preview(slot(savedRoot, labels[i]), ratios[i], previousUrls[i]);
            result.slots.push({ ratio: ratios[i], sha256: materials[i].sha256, ...saved, saved: true });
          }
        }
        click(exact(savedRoot, ["取消"]));
        await wait(() => !visible(savedRoot), "B站预览关闭");
      }
      await verifyIdentity();
      result.status = "saved";
      mark("both_slots_saved");
    } catch (error) {
      result.status = result.mutationStarted ? "needs_attention" : "failed";
      result.error = String(error?.message || error);
      mark(result.status);
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

  async function uploadVideo(file: File): Promise<boolean> {
    const fileInput = (await waitForElementOptional('input[type="file"]')) as HTMLInputElement | null;
    if (!fileInput) {
      console.log("未找到视频上传文件输入框");
      return false;
    }

    // 创建一个新的 File 对象，因为某些浏览器可能不允许直接设置 fileInput.files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发 change 事件
    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    console.log("视频上传事件已触发");
    return true;
  }

  async function waitForUploadCompletion(timeout = 600000): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const spans = document.querySelectorAll("span");
        const uploadCompleteElement = Array.from(spans).find((span) => span.textContent?.includes("上传完成"));
        if (uploadCompleteElement) {
          clearInterval(checkInterval);
          console.log("视频上传完成");
          resolve();
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("视频上传超时"));
      }, timeout);
    });
  }

  try {
    const { content, video, title, tags, cover, horizontalCover, description, original } = data.data as VideoData;

    // 视频简介优先使用 description（独立字段），未提供时回退到 content
    const videoDescription = description ?? content;
    // 原创声明:用户未明确指定时默认为原创(B 站投稿默认勾选)
    const isOriginal = original !== false;

    // 处理视频上传
    if (video) {
      await waitForElementOptional('input[type="file"]');
      await sleep(1000);

      const response = await fetch(video.url);
      const blob = await response.arrayBuffer();
      const extension = video.name.split(".").pop() || "mp4";
      const videoFilename = `${title}.${extension}`;
      const videoFile = new File([blob], videoFilename, { type: video.type });

      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      const videoUploadTriggered = await uploadVideo(videoFile);
      if (!videoUploadTriggered) return;
      console.log("视频上传已初始化");

      try {
        await waitForUploadCompletion();
        console.log("视频上传已完成，继续后续操作");
      } catch (error) {
        console.error("等待视频上传完成时出错:", error);
        return;
      }
    } else {
      console.error("没有视频文件");
      return;
    }

    // Handle title input.
    const titleInput =
      ((await waitForElementOptional('input[maxlength="80"][type="text"]')) as HTMLInputElement | null) ||
      ((await waitForElementOptional('input.input-val[type="text"][maxlength="80"]', 3000)) as HTMLInputElement | null);
    if (title) {
      if (titleInput) {
        titleInput.focus();
        titleInput.value = title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
        titleInput.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("标题已输入:", title);
      } else {
        console.log("未找到标题输入框");
      }
    }

    // 等待简介编辑器出现并输入内容
    const editor = (await waitForElementOptional('div.ql-editor[contenteditable="true"]')) as HTMLDivElement | null;
    if (editor) {
      editor.innerHTML = videoDescription || "";
      console.log("简介已输入:", videoDescription);
    } else {
      console.log("未找到简介编辑器");
    }

    // Original declaration defaults to self-made; explicit false cancels it when the checkbox exists.
    applyOriginalDeclaration(isOriginal);

    await sleep(3000);

    // Handle tags best-effort.
    try {
      const existingTags = document.querySelectorAll("div.tag-pre-wrp > div.label-item-v2-container");
      console.log(`发现 ${existingTags.length} 个已有标签，准备清除...`);
      for (let i = 0; i < existingTags.length; i++) {
        const tag = existingTags[i] as HTMLElement;
        const closeButton = tag.querySelector(".label-item-v2-close");
        if (closeButton) {
          (closeButton as HTMLElement).click();
          await sleep(400);
        }
      }

      if (!tags || tags.length === 0) {
        console.log("未指定标签，选择热门标签...");
        const hotTags = document.querySelectorAll(".hot-tag-item");
        if (hotTags.length > 0) {
          for (let i = 0; i < 3 && i < hotTags.length; i++) {
            const tag = hotTags[i] as HTMLElement;
            tag.click();
            await sleep(1000);
          }
        }
      } else {
        console.log("添加指定标签...");
        const tagInput = document.querySelector('input[placeholder="按回车键Enter创建标签"]') as HTMLInputElement;
        if (tagInput) {
          for (const tag of tags.slice(0, 10)) {
            tagInput.value = tag;
            const enterEvent = new KeyboardEvent("keydown", {
              bubbles: true,
              cancelable: true,
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
            });
            tagInput.dispatchEvent(enterEvent);
            await sleep(1000);
          }
        }
      }
    } catch (error) {
      console.warn("Bilibili 标签处理失败，继续发布流程:", error);
    }

    // 分别上传主封面和空间封面，并复核保存结果。
    await uploadCovers({ cover, horizontalCover });

    // 等待标签和封面处理完成
    await sleep(5000);

    // 如果需要自动发布
    if (data.isAutoPublish) {
      const submitButton = document.querySelector("span.submit-add") as HTMLElement;
      if (submitButton) {
        console.log("点击发布按钮");
        submitButton.click();
      } else {
        console.log('未找到"发送"按钮');
      }
    }
  } catch (error) {
    console.error("BilibiliVideo 发布过程中出错:", error);
  }
}
