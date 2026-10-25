import type { FileData, SyncData, VideoData } from "../common";
import type {
  CoverImageSource,
  CoverMaterial,
  CoverUploadResult,
  MissingVideoIdentity,
  ReadyVideoIdentity,
  SavedImagePreview,
  VideoIdentity,
} from "./cover-types";

export async function VideoDouyin(data: SyncData) {
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

  async function uploadVideo(file: File): Promise<void> {
    const fileInput = (await waitForElement("input[type=file]")) as HTMLInputElement;

    // 创建一个新的 File 对象，因为某些浏览器可能不允许直接设置 fileInput.files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发 change 事件
    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    // 触发 input 事件
    const inputEvent = new Event("input", { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log("视频上传事件已触发");
  }

  async function uploadCovers(covers: Pick<VideoData, "cover" | "verticalCover" | "horizontalCover">) {
    const platform = "douyin";
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
    const host = "creator.douyin.com";
    const pageUrl = location.href;
    let mediaBefore: ReadyVideoIdentity | undefined = null;
    const inspectMedia = (): VideoIdentity => {
      const missing: MissingVideoIdentity = { videoReady: false };
      const player = all<HTMLVideoElement>(document, "video").find(
        (e) => e.readyState >= 2 && Number.isFinite(e.duration) && e.duration > 0,
      );
      return player
        ? { videoReady: true, kind: "player", src: player.currentSrc || player.src, duration: player.duration }
        : missing;
    };
    const verifyIdentity = async (ownedEditor?: () => boolean): Promise<void> => {
      if (location.hostname !== host || location.href !== pageUrl) throw Error("Draft origin or URL changed");
      const current = inspectMedia();
      if (!current.videoReady) {
        if (ownedEditor && mediaBefore?.kind === "player" && all(document, "video").length === 0 && ownedEditor())
          return;
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
      if (element.matches('[class*="coverControl-"]')) {
        element = element.querySelector<HTMLElement>('[class*="background-"]');
        if (!element) return null;
      }
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
      {
        const controls = all(root, '[class*="coverControl-"]').filter(visible);
        if (controls.length) {
          const matching = controls.filter((e) => exact(e, [label]));
          if (matching.length !== 1 || labels.some((other) => other !== label && exact(matching[0], [other])))
            throw Error("抖音横竖封面容器不唯一");
          return matching[0];
        }
      }
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
    const ratios = ["4x3", "3x4"];
    const labels = ["横封面4:3", "竖封面3:4"];
    const files = [
      request.data.cover || request.data.horizontalCover || request.data.verticalCover,
      request.data.verticalCover || request.data.cover || request.data.horizontalCover,
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
        const previous = [];
        let sharedRoot: HTMLElement | null = null;
        for (let i = 0; i < 2; i++) {
          if (!sharedRoot) await verifyIdentity();
          const area = slot(document, labels[i]);
          const before = imageSource(area)?.url;
          previous[i] = before;
          if (!sharedRoot) click(exact(area, ["选择封面"]) || area.querySelector<HTMLImageElement>("img") || area);
          const root: HTMLElement = sharedRoot || (await wait(editor, "抖音封面编辑器"));
          const modern = !!root.querySelector<HTMLElement>('[class*="selectArea-"]');
          let input: HTMLInputElement;
          let readSignature: (() => string | null) | undefined;
          let mode: string | undefined;
          if (modern) {
            mode = i === 0 ? "横封面预览（4:3）" : "竖封面预览（3:4）";
            await wait(() => exact(root, [mode]), "抖音当前封面比例模式");
            input = await wait(() => {
              const areas = all(root, '[class*="selectArea-"]').filter(visible);
              if (areas.length !== 1) return null;
              const inputs = all<HTMLInputElement>(
                areas[0],
                "input.semi-upload-hidden-input[type=file][accept*=image]:not(.semi-upload-hidden-input-replace)",
              );
              return inputs.length === 1 ? inputs[0] : null;
            }, "抖音活动封面主输入框");
            readSignature = () => {
              const canvases = all<HTMLCanvasElement>(root, "canvas.lower-canvas").filter(
                (e) => visible(e) && e.className.split(/\s+/).some((c) => c.startsWith("cloudImage-")),
              );
              if (canvases.length !== 1) return null;
              try {
                return canvases[0].toDataURL();
              } catch {
                throw Error("无法读取抖音活动封面画布");
              }
            };
            await wait(readSignature, "抖音活动封面画布就绪");
          } else {
            const upload = exact(root, ["上传封面", "上传封面图片", "本地上传"]);
            if (upload) click(upload);
            input = await wait(
              () => root.querySelector<HTMLInputElement>("input[type=file][accept*=image]"),
              "抖音封面图片输入框",
            );
          }
          await setImage(input, materials[i], root, ratios[i], readSignature);
          const uploadedSignature = modern ? readSignature() : undefined;
          const inputAccept = input.accept;
          const ownedEditor = modern
            ? () => {
                const areas = all(root, '[class*="selectArea-"]').filter(visible);
                const inputs =
                  areas.length === 1
                    ? all<HTMLInputElement>(
                        areas[0],
                        "input.semi-upload-hidden-input[type=file][accept*=image]:not(.semi-upload-hidden-input-replace)",
                      )
                    : [];
                const checks = {
                  sameEditor: editor() === root,
                  editorVisible: visible(root),
                  sameMode: !!exact(root, [mode]),
                  sameSlot: slot(document, labels[i]) === area,
                  sameBackground: imageSource(area)?.url === before,
                  oneArea: areas.length === 1,
                  oneInput: inputs.length === 1,
                  sameInput: inputs[0] === input,
                  compatibleInput: inputs[0]?.type === "file" && inputs[0].accept === inputAccept,
                  sameUploadedCanvas: !!uploadedSignature && readSignature() === uploadedSignature,
                };
                result.editorLifecycle = checks;
                return Object.entries(checks)
                  .filter(([key]) => key !== "sameInput")
                  .every(([, value]) => value);
              }
            : undefined;
          await verifyIdentity(ownedEditor);
          if (modern && i === 0) {
            click(exact(root, ["设置竖封面"]));
            await wait(() => exact(root, ["竖封面预览（3:4）"]), "抖音切换竖封面");
            sharedRoot = root;
            mark("slot_preview_staged", ratios[i]);
            continue;
          }
          click(exact(root, ["完成"]));
          await wait(() => !visible(root), "抖音封面保存");
          mark("editor_saved", ratios[i]);
          if (modern && !(await inspectMedia()).videoReady) {
            const videoPreview = exact(document, ["预览视频"]);
            if (videoPreview) click(videoPreview);
          }
          await wait(async () => (await inspectMedia()).videoReady, "抖音主播放器恢复");
          await verifyIdentity();
          if (sharedRoot) {
            for (let j = 0; j < 2; j++) {
              const saved = await preview(slot(document, labels[j]), ratios[j], previous[j]);
              result.slots.push({ ratio: ratios[j], sha256: materials[j].sha256, ...saved, saved: true });
            }
          } else {
            const saved = await preview(slot(document, labels[i]), ratios[i], before);
            result.slots.push({ ratio: ratios[i], sha256: materials[i].sha256, ...saved, saved: true });
          }
        }
        for (let i = 0; i < 2; i++) {
          const current = await preview(slot(document, labels[i]), ratios[i], previous[i]);
          if (
            current.previewUrl !== result.slots[i].previewUrl ||
            current.width !== result.slots[i].width ||
            current.height !== result.slots[i].height
          )
            throw Error(`第二槽保存后${ratios[i]}封面发生变化`);
          mark("slot_final_verified", ratios[i]);
        }
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

  try {
    const { content, video, title, tags, cover, horizontalCover, verticalCover, scheduledPublishTime } =
      data.data as VideoData;
    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      await uploadVideo(videoFile);
      console.log("视频上传已初始化");
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 处理标题输入
    const titleInput = (await waitForElement('input[placeholder*="作品标题"]')) as HTMLInputElement;
    if (titleInput) {
      titleInput.value = title || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("标题已填写:", titleInput.value);
    }

    // 填写内容和标签
    const contentEditor = (await waitForElement(
      'div.zone-container.editor-kit-container.editor.editor-comp-publish[contenteditable="true"]',
    )) as HTMLDivElement;
    if (contentEditor) {
      // 填写描述内容
      contentEditor.focus();
      const contentPasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });

      contentPasteEvent.clipboardData.setData("text/plain", `${content} `);
      contentEditor.dispatchEvent(contentPasteEvent);

      // 处理标签
      if (tags && tags.length > 0) {
        const tagsToSync = tags.slice(0, 5);
        for (const tag of tagsToSync) {
          console.log("添加标签:", tag);
          contentEditor.focus();

          const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer(),
          });

          pasteEvent.clipboardData.setData("text/plain", ` #${tag}`);
          contentEditor.dispatchEvent(pasteEvent);

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // 在同一封面编辑器内分别上传横版和竖版封面。
    await uploadCovers({ cover, horizontalCover, verticalCover });

    // 处理定时发布
    if (scheduledPublishTime) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const labels = document.querySelectorAll("label");
      console.log("labels -->", labels);
      const scheduledLabel = Array.from(labels).find((label) => label.textContent?.includes("定时发布"));
      console.log("scheduledLabel -->", scheduledLabel);
      if (scheduledLabel) {
        (scheduledLabel as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 500));

        const publishTimeInput = document.querySelector('input[format="yyyy-MM-dd HH:mm"]') as HTMLInputElement;
        console.log("publishTimeInput -->", publishTimeInput);
        if (publishTimeInput) {
          publishTimeInput.value = formatDate(new Date(scheduledPublishTime));
          publishTimeInput.dispatchEvent(new Event("input", { bubbles: true }));
          publishTimeInput.dispatchEvent(new Event("change", { bubbles: true }));
          console.log("定时发布时间已设置:", publishTimeInput.value);
        }
      }
    }

    if (data.isAutoPublish === true) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const buttons = document.querySelectorAll("button");
      const publishButton = Array.from(buttons).find((button) => button.textContent === "发布");

      if (publishButton) {
        console.log("点击发布按钮");
        publishButton.click();
      } else {
        console.log('未找到"发布"按钮');
      }
    }
  } catch (error) {
    console.error("DouyinVideo 发布过程中出错:", error);
  }
}
