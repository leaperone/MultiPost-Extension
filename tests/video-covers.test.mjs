import assert from "node:assert/strict";
import { Blob, File } from "node:buffer";
import { webcrypto } from "node:crypto";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { bilibiliPage, douyinPage } from "./video-cover-fixtures.mjs";

async function platformSource(name) {
  const source = await fs.readFile(new URL(`../src/sync/video/${name}.ts`, import.meta.url), "utf8");
  return ts.createSourceFile(`${name}.ts`, source, ts.ScriptTarget.Latest, true);
}

function serializedFunction(node, globals = {}) {
  const js = ts.transpileModule(node.getText(), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    reportDiagnostics: true,
  });
  assert.equal(js.diagnostics?.length || 0, 0);
  return vm.runInNewContext(`(() => {${js.outputText}; return ${node.name.text};})()`, globals);
}

function nestedFunction(source, name) {
  const platform = source.statements.find(ts.isFunctionDeclaration);
  const nested = platform.body.statements.find((node) => ts.isFunctionDeclaration(node) && node.name.text === name);
  assert(nested, `${name} must stay inside the serialized platform function`);
  return nested;
}

const helpers = Object.fromEntries(
  await Promise.all(
    ["bilibili", "douyin", "rednote", "weixinchannel"].map(async (name) => [
      name,
      serializedFunction(nestedFunction(await platformSource(name), "uploadCovers")).toString(),
    ]),
  ),
);

test("serialized Bilibili cover code saves two ratios and reopens matching cropped pixels", async () => {
  const page = bilibiliPage(helpers.bilibili, {
    startClosed: true,
    nestedEntry: true,
    initialWrongRatio: true,
    delayedCrop: true,
  });
  const result = await page.run();
  assert.equal(result.status, "saved", result.error);
  assert.equal(page.writes(), 2);
  assert.deepEqual(
    Array.from(result.slots, (s) => s.ratio),
    ["4x3", "16x9"],
  );
  for (const slot of result.slots) assert.equal(slot.inputPreviewSha256, slot.previewSha256);
});

test("Bilibili keeps single-cover fallback and works in a background publishing tab", async () => {
  const page = bilibiliPage(helpers.bilibili, { pageVisible: false });
  const result = await page.run({ cover: page.covers.cover });
  assert.equal(result.status, "saved", result.error);
  assert.equal(result.slots.length, 2);
});

test("Bilibili rejects changed saved pixels, changed video and disabled cover controls", async () => {
  for (const options of [
    { reopenMismatch: true },
    { wrongVideo: true },
    { disabledEntry: "disabled", startClosed: true, nestedEntry: true },
  ]) {
    const page = bilibiliPage(helpers.bilibili, options);
    const result = await page.run();
    assert.notEqual(result.status, "saved");
    if (options.disabledEntry) assert.equal(page.writes(), 0);
  }
});

test("serialized Douyin code stages both covers in one editor and restores the original player", async () => {
  const page = douyinPage(helpers.douyin, { unmountPlayer: true, replacePrimary: true, requiresVideoTab: true });
  const result = await page.run();
  assert.equal(result.status, "saved", result.error);
  assert.deepEqual(page.writes, ["4x3", "3x4"]);
  assert.equal(page.aiWrites(), 0);
  assert.equal(page.replaceWrites(), 0);
});

test("Douyin accepts a single optional cover and does not require MIME or a caller SHA", async () => {
  const page = douyinPage(helpers.douyin, { unmountPlayer: true, replacePrimary: true, requiresVideoTab: true });
  const result = await page.run({ cover: page.covers.cover });
  assert.equal(result.status, "saved", result.error);
  assert.equal(result.slots.length, 2);
});

test("Douyin fails for ambiguous inputs, wrong mode, changed player and cross-slot overwrite", async () => {
  for (const options of [
    { ambiguousInput: true },
    { wrongMode: true },
    { changedAfterSave: true, unmountPlayer: true },
    { overwriteFirst: true },
  ]) {
    const page = douyinPage(helpers.douyin, options);
    const result = await page.run();
    assert.notEqual(result.status, "saved");
    if (options.ambiguousInput || options.wrongMode) assert.equal(page.writes.length, 0);
  }
});

const element = (text = "", extra = {}) => ({
  tagName: "DIV",
  textContent: text,
  style: {},
  getClientRects: () => [{}],
  getAttribute: () => null,
  closest: () => null,
  querySelectorAll: () => [],
  ...extra,
});
class Transfer {
  constructor() {
    this.files = [];
    this.items = { add: (file) => this.files.push(file) };
  }
}
function context(document, hostname, { responseType = "image/png", http = 200 } = {}) {
  let clock = Date.now();
  class TestDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [clock]));
    }
    static now() {
      return clock;
    }
  }
  return {
    document,
    location: { hostname },
    getComputedStyle: () => ({ visibility: "visible" }),
    File,
    Blob,
    Event,
    AbortSignal,
    DataTransfer: Transfer,
    Date: TestDate,
    setTimeout: (fn, ms = 0) => {
      clock += ms;
      queueMicrotask(fn);
    },
    crypto: webcrypto,
    console: { info() {} },
    fetch: async (url) => ({
      ok: http === 200,
      status: http,
      headers: { get: () => responseType },
      arrayBuffer: async () => new TextEncoder().encode(url).buffer,
    }),
    createImageBitmap: async () => ({ width: 1200, height: 900, close() {} }),
  };
}
const image = (name, type) => ({
  url: `https://example.test/${name}.png`,
  name: `${name}.png`,
  ...(type ? { type } : {}),
});

function videoChannelPage(covers, options = {}) {
  let opened = false;
  let active = 0;
  let version = 0;
  let popupPending = false;
  let popupReads = 0;
  const writes = [];
  const assignedTypes = [];
  const previews = [0, 1].map(() =>
    element("", {
      tagName: "IMG",
      complete: true,
      src: "https://example.test/frame.png",
      naturalWidth: 1600,
      naturalHeight: 900,
    }),
  );
  const areas = previews.map((preview) => element("", { querySelectorAll: () => [preview] }));
  const canvas = element("", { tagName: "CANVAS", toDataURL: () => `${active}:${version}` });
  const input = {
    type: "file",
    accept: "image/png,image/jpeg",
    dispatchEvent(event) {
      if (event.type === "change") {
        writes.push([active, this.files[0].name]);
        assignedTypes.push(this.files[0].type);
        version++;
      }
    },
  };
  const editor = element("", {
    getClientRects: () => (opened ? [{}] : []),
    querySelector: () => input,
    querySelectorAll: (selector) => (selector === "img,canvas,[style]" ? [canvas] : []),
  });
  const main = element("", {
    click() {
      active = 0;
      opened = true;
      version = 0;
    },
  });
  const share = element("", {
    click() {
      active = 1;
      popupPending = true;
      popupReads = 2;
    },
  });
  const direct = element("直接编辑", {
    getClientRects() {
      if (!popupPending) return [];
      if (popupReads-- > 0) return [];
      return [{}];
    },
    click() {
      popupPending = false;
      opened = true;
      version = 0;
    },
  });
  const hiddenConfirm = element("确认", {
    getClientRects: () => [],
    click() {
      throw Error("hidden confirmation must not be clicked");
    },
  });
  const confirm = element("确认", {
    tagName: "BUTTON",
    getClientRects: () => (opened ? [{}] : []),
    click() {
      previews[active].src = `https://example.test/saved-${active}.png`;
      previews[active].naturalWidth = active ? 1200 : 810;
      previews[active].naturalHeight = active ? 900 : 1080;
      opened = false;
    },
  });
  const root = {
    querySelector: (selector) =>
      selector === ".vertical-cover-wrap"
        ? Object.assign(areas[0], { click: main.click })
        : selector === ".horizon-img-wrap"
          ? areas[1]
          : selector === ".horizon-img-wrap .edit-btn"
            ? share
            : selector === ".cover-control-wrap"
              ? editor
              : null,
    querySelectorAll: (selector) =>
      selector === "video"
        ? [{ readyState: 4, duration: 6, currentSrc: "https://example.test/TEST.mp4" }]
        : selector === "button,span,div"
          ? [direct]
          : selector === ".cover-control-wrap"
            ? [editor]
            : selector === ".finder-dialog-footer button"
              ? [hiddenConfirm, confirm]
              : [],
  };
  const document = { querySelector: () => ({ shadowRoot: root }) };
  const run = vm.runInNewContext(`(${helpers.weixinchannel})`, context(document, "channels.weixin.qq.com", options));
  return { run: () => run(covers), writes, assignedTypes };
}

test("video channel waits through a stale hidden editor and maps all three inputs correctly", async () => {
  const page = videoChannelPage({
    cover: image("standard"),
    verticalCover: image("portrait"),
    horizontalCover: image("wide"),
  });
  const result = await page.run();
  assert.equal(result.status, "saved", result.error);
  assert.deepEqual(page.writes, [
    [0, "portrait.png"],
    [1, "standard.png"],
  ]);
  assert.deepEqual(
    Array.from(result.slots, (s) => s.ratio),
    ["3x4", "4x3"],
  );
});

test("video channel preserves optional single-cover fallbacks", async () => {
  for (const [covers, expected] of [
    [
      { cover: image("standard") },
      [
        [0, "standard.png"],
        [1, "standard.png"],
      ],
    ],
    [{ verticalCover: image("portrait") }, [[0, "portrait.png"]]],
    [{ horizontalCover: image("wide") }, [[1, "wide.png"]]],
    [{}, []],
  ]) {
    const page = videoChannelPage(covers);
    const result = await page.run();
    assert.equal(result.status, expected.length ? "saved" : "skipped", result.error);
    assert.deepEqual(page.writes, expected);
  }
});

test("MIME may come from the response or a valid caller declaration with a binary response", async () => {
  for (const [responseType, declared] of [
    ["image/png", undefined],
    ["application/octet-stream", "image/png"],
  ]) {
    const page = videoChannelPage({ verticalCover: image("portrait", declared) }, { responseType });
    const result = await page.run();
    assert.equal(result.status, "saved", result.error);
    assert.deepEqual(page.assignedTypes, ["image/png"]);
  }
});

test("HTTP errors fail before any platform image input changes", async () => {
  const page = videoChannelPage({ verticalCover: image("portrait") }, { http: 403 });
  const result = await page.run();
  assert.equal(result.status, "failed");
  assert.equal(result.mutationStarted, false);
  assert.equal(page.writes.length, 0);
  assert.match(result.error, /HTTP 403/);
});

test("serialized Rednote code waits for the selected canvas and real enabled button, accepting non-4:3", async () => {
  let opened = false;
  let uploaded = false;
  let selected = false;
  let missingReads = 0;
  let buttonChecks = 0;
  let finishedEarly = false;
  const thumbImage = element("", {
    tagName: "IMG",
    complete: true,
    naturalWidth: 900,
    naturalHeight: 1200,
    src: "",
    click() {
      selected = true;
      missingReads = 2;
    },
  });
  const thumb = element("", {
    querySelector: (selector) =>
      selector === ".uploaded-thumbnail-inactive-mask" ? (selected ? null : {}) : thumbImage,
  });
  const canvas = element("", { tagName: "CANVAS", toDataURL: () => (selected ? "NEW" : "OLD") });
  const input = {
    type: "file",
    accept: "image/png",
    dispatchEvent(event) {
      if (event.type === "change") {
        uploaded = true;
        thumbImage.src = "https://example.test/uploaded.png";
      }
    },
  };
  const button = element("", {
    tagName: "BUTTON",
    click() {
      finishedEarly = missingReads > 0;
      opened = false;
      card.style.backgroundImage = "url(https://example.test/SAVED.png)";
    },
  });
  Object.defineProperty(button, "disabled", {
    get() {
      return buttonChecks++ < 2;
    },
  });
  const done = element("完成", {
    closest: (selector) => (selector.startsWith("button") ? button : null),
    click() {
      throw Error("must click the actual button");
    },
  });
  const editor = element("", {
    isConnected: true,
    matches: () => true,
    getClientRects: () => (opened ? [{}] : []),
    querySelector: () => input,
    querySelectorAll(selector) {
      if (selector === "button,span,div") return [done];
      if (selector === "button.video-panel-switch-item") return [];
      if (selector === "button.uploaded-thumbnail") return uploaded ? [thumb] : [];
      if (selector === "canvas.canvas-gl") {
        if (selected && missingReads > 0) {
          missingReads--;
          return [];
        }
        return [canvas];
      }
      if (selector === "img,canvas,[style]") return [thumbImage, canvas];
      return [];
    },
  });
  const entry = element("编辑封面", {
    click() {
      opened = true;
    },
  });
  const card = element("", {
    style: { backgroundImage: "url(https://example.test/OLD.png)" },
    querySelector: () => entry,
  });
  const document = {
    body: {},
    querySelector: (selector) =>
      selector === ".default.row" ? card : selector === ".main-cover-editor-modal" ? editor : null,
    querySelectorAll: (selector) =>
      selector === "video" ? [{ readyState: 4, duration: 6, currentSrc: "https://example.test/TEST.mp4" }] : [],
  };
  class DecodedImage {
    constructor() {
      this.naturalWidth = 900;
      this.naturalHeight = 1200;
    }
    async decode() {}
  }
  const run = vm.runInNewContext(`(${helpers.rednote})`, {
    ...context(document, "creator.xiaohongshu.com"),
    Image: DecodedImage,
  });
  const result = await run({ cover: image("portrait") });
  assert.equal(result.status, "saved", result.error);
  assert.equal(finishedEarly, false);
  assert(buttonChecks >= 3);
  assert.equal(result.slots[0].width, 900);
  assert.equal(result.slots[0].height, 1200);
});
