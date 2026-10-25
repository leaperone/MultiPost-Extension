import { Blob, File } from "node:buffer";
import { webcrypto } from "node:crypto";
// Synthetic DOM only; no browser/account/network calls.
import vm from "node:vm";

export function bilibiliPage(
  uploadFunctionText,
  {
    tainted = false,
    reopenMismatch = false,
    wrongVideo = false,
    canvasUnreadable = false,
    pageVisible = true,
    nestedEntry = false,
    startClosed = false,
    delayedReopen = false,
    disabledEntry = "",
    initialWrongRatio = false,
    delayedCrop = false,
  } = {},
) {
  let open = !startClosed;
  let active = 0;
  let writes = 0;
  let saved = false;
  const labels = ["首页推荐封面（4:3）", "个人空间封面（16:9）"];
  const images = [
    { tagName: "IMG", complete: true, naturalWidth: 500, naturalHeight: 375, src: "blob:old43", pixels: 1 },
    { tagName: "IMG", complete: true, naturalWidth: 500, naturalHeight: 281, src: "blob:old169", pixels: 2 },
  ];
  if (initialWrongRatio) images[0].naturalHeight = 281;
  const visible = () => [{}];
  const element = (text, click) => ({
    textContent: text,
    getClientRects: visible,
    getAttribute: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    click,
  });
  const labelNodes = labels.map((label, i) =>
    element(label, () => {
      active = i;
    }),
  );
  const areas = labelNodes.map((label, i) => ({
    querySelectorAll: (selector) =>
      selector === "button,span,div,a"
        ? [label]
        : selector === "img,canvas"
          ? [
              {
                tagName: "CANVAS",
                toDataURL: () => {
                  if (canvasUnreadable) throw Error("SecurityError");
                  return String(images[i].pixels);
                },
              },
            ]
          : [],
  }));
  labelNodes.forEach((label, i) => {
    label.closest = (selector) => (selector === ".cover-editor-panel-canvas > div" ? areas[i] : null);
  });
  const done = element("完成", () => {
    open = false;
    saved = true;
  });
  const cancel = element("取消", () => {
    open = false;
  });
  const input = {
    type: "file",
    accept: "image/png",
    dispatchEvent(event) {
      if (event.type === "change") {
        writes++;
        const index = active;
        images[index].src = `blob:new${index}`;
        const finish = () => {
          images[index].pixels = 10 + index;
          images[index].naturalHeight = index ? 281 : 375;
        };
        if (delayedCrop) {
          images[index].naturalHeight = 500;
          setTimeout(finish, 300);
        } else finish();
      }
    },
  };
  const root = {
    getClientRects: () => (open ? [{}] : []),
    querySelector(selector) {
      if (selector === ".cover-editor-panel-canvas") return {};
      if (selector === ".sync-checkbox-wrapper input:checked") return null;
      if (selector === "input[type=file][accept*=image]") return input;
      if (selector === ".cover-phone-view-home-video-img img") return images[0];
      if (selector === ".cover-phone-view-space-video-img img") return images[1];
      return null;
    },
    querySelectorAll: (selector) =>
      selector === "button,span,div,a" ? [...labelNodes, done, cancel] : selector === "img,canvas" ? images : [],
  };
  const pill = element("添加封面", () => {
    open = true;
    if (saved && reopenMismatch) images[0].pixels = 99;
    if (saved && delayedReopen) {
      images.forEach((img) => {
        img.complete = false;
      });
      setTimeout(
        () =>
          images.forEach((img) => {
            img.complete = true;
          }),
        10,
      );
    }
  });
  pill.disabled = disabledEntry === "disabled";
  pill.getAttribute = (name) => (name === "aria-disabled" && disabledEntry === "aria" ? "true" : null);
  const entry = element("添加封面", () => pill.click());
  pill.querySelectorAll = () => [entry];
  entry.closest = (selector) =>
    selector.startsWith("button,") || (disabledEntry && selector.startsWith("[disabled]")) ? pill : null;
  const outer = element("添加封面", () => {
    throw Error("noninteractive outer cover-module");
  });
  outer.querySelectorAll = () => [pill, entry];
  const main = { querySelectorAll: () => [outer, pill, entry] };
  const document = {
    body: {},
    visibilityState: pageVisible ? "visible" : "hidden",
    hasFocus: () => pageVisible,
    querySelector: (selector) => (nestedEntry ? (selector === "div.cover-main" ? main : null) : entry),
    querySelectorAll: (selector) =>
      selector === "input"
        ? [{ value: "TEST", type: "text", maxLength: 80 }]
        : selector === "[role=dialog],.cover-editor,.cover-select-dialog,.cover-select-container,.semi-modal-content"
          ? [root]
          : [],
    createElement() {
      let image;
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            drawImage(img) {
              image = img;
            },
            getImageData() {
              if (tainted) throw Error("SecurityError");
              return { data: new Uint8Array([image.pixels, 40, 80, 255]) };
            },
          };
        },
      };
    },
  };
  const asset = (ratio) => {
    const _bytes = new TextEncoder().encode(ratio);
    return { url: `https://example.test/${ratio}`, name: `${ratio}.png` };
  };
  const request = {
    cover: asset("4x3"),
    horizontalCover: asset("16x9"),
  };
  class Transfer {
    constructor() {
      this.files = [];
      this.items = { add: (file) => this.files.push(file) };
    }
  }
  let clock = Date.now();
  const fakeClock = !pageVisible || reopenMismatch;
  const RuntimeDate = !fakeClock
    ? Date
    : class extends Date {
        constructor(...args) {
          super(...(args.length ? args : [clock]));
        }
        static now() {
          return clock;
        }
      };
  const runtimeTimeout = !fakeClock
    ? setTimeout
    : (fn, ms) => {
        if (ms !== 200) return setTimeout(fn, ms);
        clock += ms;
        queueMicrotask(fn);
      };

  const testVideo = new File(["TEST VIDEO"], "TEST.mp4", { type: "video/mp4" });
  const otherVideo = new File(["OTHER VIDEO"], "OTHER.mp4", { type: "video/mp4" });
  const videoInput = {
    accept: ".mp4",
    get files() {
      return [wrongVideo && writes > 0 ? otherVideo : testVideo];
    },
  };
  const queryOriginal = document.querySelectorAll;
  document.querySelectorAll = (selector) =>
    selector === ".task[title]"
      ? [{ getClientRects: () => [{}], classList: { contains: () => true }, querySelector: () => ({}) }]
      : selector === ".file-item-content-status"
        ? [{ getClientRects: () => [{}], textContent: "上传完成" }]
        : selector === "input[type=file]"
          ? [videoInput]
          : queryOriginal(selector);

  const run = vm.runInNewContext(`(${uploadFunctionText})`, {
    document,
    location: { hostname: "member.bilibili.com", href: "https://member.bilibili.com/platform/upload/video/frame" },
    URL,
    Date: RuntimeDate,
    File,
    Blob,
    Event,
    AbortSignal,
    DataTransfer: Transfer,
    crypto: webcrypto,
    setTimeout: runtimeTimeout,
    clearTimeout,
    console: { info() {} },
    fetch: async (url) => {
      const bytes = new TextEncoder().encode(url.split("/").at(-1));
      return { ok: true, headers: { get: () => "image/png" }, arrayBuffer: async () => bytes.buffer };
    },
    createImageBitmap: async (blob) => {
      const ratio = await blob.text();
      return { width: ratio === "4x3" ? 400 : 1600, height: ratio === "4x3" ? 300 : 900, close() {} };
    },
    getComputedStyle: () => ({ visibility: "visible" }),
  });
  return { run: (covers = request) => run(covers), writes: () => writes, covers: request };
}

export function douyinPage(
  uploadFunctionText,
  {
    overwriteFirst = false,
    ambiguousInput = false,
    wrongMode = false,
    combinedControl = false,
    taintedCanvas = false,
    unmountPlayer = false,
    missingAfterSave = false,
    changedAfterSave = false,
    unreadyPlayerInEditor = false,
    replacePrimary = false,
    requiresVideoTab = false,
  } = {},
) {
  let clock = Date.now();
  let opened = false;
  let active = 0;
  let canvasVersion = 0;
  let aiWrites = 0;
  let replaceWrites = 0;
  let videoTabSelected = false;
  const writes = [];
  const labels = ["横封面4:3", "竖封面3:4"];
  const ratios = ["4x3", "3x4"];
  const url = "https://creator.douyin.com/creator-micro/content/post/video?enter_from=publish_page";
  const el = (text = "", extra = {}) => ({
    tagName: "DIV",
    textContent: text,
    style: {},
    getClientRects: () => [{}],
    getAttribute: () => null,
    closest: () => null,
    matches: () => false,
    querySelectorAll: () => [],
    querySelector: () => null,
    click() {},
    ...extra,
  });
  const previews = ratios.map(() =>
    el("", {
      tagName: "IMG",
      complete: true,
      src: "https://cdn.example/frame.jpeg",
      naturalWidth: 1400,
      naturalHeight: 788,
    }),
  );
  const icon = el("", {
    tagName: "IMG",
    complete: true,
    src: "https://cdn.example/icon.png",
    naturalWidth: 24,
    naturalHeight: 24,
  });
  const controls = labels.map((label, i) => {
    const tip = el(label);
    const labelParent = el(label, { querySelectorAll: () => [tip] });
    tip.parentElement = labelParent;
    const choose = el("选择封面", {
      click() {
        opened = true;
        active = i;
        canvasVersion = 0;
      },
    });
    const background = el("", { querySelectorAll: () => [previews[i]] });
    return el(`选择封面${label}`, {
      className: "coverControl-TEST",
      matches: (selector) => selector.includes("coverControl-"),
      querySelector: (selector) => {
        if (selector.includes("background-")) {
          if (overwriteFirst && !opened && writes.length === 2 && i === 1)
            previews[0].src = "https://cdn.example/overwritten.jpeg";
          return background;
        }
        return selector === "img" ? icon : null;
      },
      querySelectorAll: (selector) =>
        selector === "button,span,div,a"
          ? [choose, labelParent, tip]
          : selector === "img,[style]"
            ? [icon, previews[i]]
            : [],
      parts: [choose, labelParent, tip],
    });
  });
  let primary = {
    type: "file",
    accept: "image/png,image/jpeg",
    dispatchEvent(event) {
      if (event.type === "change") {
        writes.push(ratios[active]);
        canvasVersion++;
        if (replacePrimary) primary = { ...primary, files: [] };
      }
    },
  };
  const ai = {
    type: "file",
    accept: "image/png",
    dispatchEvent() {
      aiWrites++;
    },
  };
  const replacement = {
    type: "file",
    accept: "image/png",
    dispatchEvent() {
      replaceWrites++;
    },
  };
  const uploadArea = el("", {
    querySelectorAll: (selector) =>
      selector.startsWith("input.semi-upload-hidden-input")
        ? ambiguousInput
          ? [primary, replacement]
          : [primary]
        : [],
  });
  const mainCanvas = el("", {
    tagName: "CANVAS",
    className: "cloudImage-TEST lower-canvas",
    toDataURL: () => {
      if (taintedCanvas) throw Error("SecurityError");
      return `${active}:${canvasVersion}`;
    },
  });
  const smallCanvas = el("", {
    tagName: "CANVAS",
    className: "horVideo-TEST lower-canvas",
    toDataURL: () => "small-preview",
  });
  const advance = el("设置竖封面", {
    tagName: "BUTTON",
    click() {
      active = 1;
      canvasVersion = 0;
    },
  });
  const done = el("完成", {
    tagName: "BUTTON",
    click() {
      for (let i = 0; i < 2; i++) {
        if (!writes.includes(ratios[i])) continue;
        previews[i].src = `https://cdn.example/${ratios[i]}.jpeg`;
        previews[i].naturalWidth = i ? 300 : 400;
        previews[i].naturalHeight = i ? 400 : 300;
      }
      opened = false;
    },
  });
  const modal = el("", {
    getClientRects: () => (opened ? [{}] : []),
    querySelector: (selector) =>
      selector.includes("selectArea-") ? uploadArea : selector === "input[type=file][accept*=image]" ? ai : null,
    querySelectorAll: (selector) => {
      if (selector === "button,span,div,a")
        return [
          el(`${wrongMode ? "竖" : active ? "竖" : "横"}封面预览（${wrongMode ? "3:4" : active ? "3:4" : "4:3"}）`),
          advance,
          done,
        ];
      if (selector === '[class*="selectArea-"]') return [uploadArea];
      if (selector === "canvas.lower-canvas") return [mainCanvas, smallCanvas];
      return [];
    },
  });
  const combined = el(labels.join(""), { querySelectorAll: () => controls.flatMap((c) => c.parts) });
  const videoTab = el("预览视频", {
    click() {
      videoTabSelected = true;
    },
  });
  const document = {
    body: {},
    visibilityState: "visible",
    hasFocus: () => true,
    querySelectorAll: (selector) =>
      selector === "input"
        ? [{ placeholder: "作品标题", value: "TEST" }]
        : selector === "video"
          ? opened && unreadyPlayerInEditor
            ? [{}]
            : []
          : selector === '[class*="coverControl-"]'
            ? combinedControl
              ? [combined]
              : controls
            : selector === "button,span,div,a"
              ? [...controls.flatMap((c) => [c, ...c.parts]), ...(requiresVideoTab ? [videoTab] : [])]
              : selector ===
                  "[role=dialog],.cover-editor,.cover-select-dialog,.cover-select-container,.semi-modal-content"
                ? [modal]
                : [],
  };
  const videoSrc = "https://video-cn.douyin.com/OFFLINE.mp4";
  const asset = (ratio) => ({ url: `https://example.test/${ratio}`, name: `${ratio}.png` });
  const request = {
    cover: asset("4x3"),
    verticalCover: asset("3x4"),
  };
  class RuntimeDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [clock]));
    }
    static now() {
      return clock;
    }
  }
  class Transfer {
    constructor() {
      this.files = [];
      this.items = { add: (file) => this.files.push(file) };
    }
  }

  const player = {
    readyState: 4,
    duration: 453.1,
    get currentSrc() {
      return changedAfterSave && !opened && writes.length > 0 ? "https://example.test/OTHER.mp4" : videoSrc;
    },
  };
  const queryOriginal = document.querySelectorAll;
  document.querySelectorAll = (selector) =>
    selector === "video"
      ? opened && unreadyPlayerInEditor
        ? [{ readyState: 0 }]
        : (opened && unmountPlayer) ||
            (missingAfterSave && !opened && writes.length > 0) ||
            (requiresVideoTab && !opened && writes.length > 0 && !videoTabSelected)
          ? []
          : [player]
      : queryOriginal(selector);

  const run = vm.runInNewContext(`(${uploadFunctionText})`, {
    document,
    location: { hostname: "creator.douyin.com", href: url },
    URL,
    Date: RuntimeDate,
    File,
    Blob,
    Event,
    AbortSignal,
    DataTransfer: Transfer,
    crypto: webcrypto,
    clearTimeout,
    setTimeout: (fn, ms) => {
      if (ms !== 200) return setTimeout(fn, ms);
      clock += ms;
      queueMicrotask(fn);
    },
    console: { info() {} },
    fetch: async (assetUrl) => {
      const bytes = new TextEncoder().encode(assetUrl.split("/").at(-1));
      return { ok: true, headers: { get: () => "image/png" }, arrayBuffer: async () => bytes.buffer };
    },
    createImageBitmap: async (blob) => {
      const ratio = await blob.text();
      return { width: ratio === "4x3" ? 400 : 300, height: ratio === "4x3" ? 300 : 400, close() {} };
    },
    getComputedStyle: () => ({ visibility: "visible" }),
  });
  return {
    run: (covers = request) => run(covers),
    writes,
    aiWrites: () => aiWrites,
    replaceWrites: () => replaceWrites,
    covers: request,
  };
}
