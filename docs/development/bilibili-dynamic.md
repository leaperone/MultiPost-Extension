# B站动态发布功能开发记录

## 在对应位置添加平台

在 `src/sync/dynamic.ts` 文件中注册 `Bilibili` 平台的动态发布。

```ts
  DYNAMIC_BILIBILI: {
    type: 'DYNAMIC', // 标识该平台为动态发布平台
    name: 'DYNAMIC_BILIBILI', // 平台名称，全局唯一
    homeUrl: 'https://t.bilibili.com', // 平台首页，可以任意填写，可以填写为登录页面
    faviconUrl: 'https://static.hdslb.com/images/favicon.ico', // 平台图标，可以在 F12 中找到网站的 Favicon 图标的地址
    iconifyIcon: 'ant-design:bilibili-outlined', // 平台图标，可以在 [Iconify](https://icones.js.org/) 中找到图标，该字段非必须
    platformName: chrome.i18n.getMessage('platformBilibili'), // 平台名称 | i18n 国际化
    injectUrl: 'https://t.bilibili.com', // 动态发布页面，实际脚本执行的时候会首先打开该页面并注入脚本
    injectFunction: DynamicBilibili, // 动态发布函数，该函数会根据 `injectUrl` 打开的页面然后将其注入到页面中
    tags: ['CN'], // 平台标签 | CN 标签标识该平台为中文平台 （该标签为默认标签，类似的还有 EN 标签标识该平台为英文平台）
    accountKey: 'bilibili', // 平台账号，该字段用于区分不同平台的账号，实际脚本执行的时候会根据该字段去 `src/sync/account/bilibili.ts` 文件中找到对应的账号信息
  },
```

## 动态发布函数

动态发布函数是动态发布功能的核心，该函数会根据 `injectUrl` 打开的页面然后将其注入到页面中。

我们在 `src/sync/dynamic/bilibili.ts` 文件中实现 `DynamicBilibili` 函数。具体代码可以点击 [这里](https://github.com/leaperone/MultiPost-Extension/blob/main/src/sync/dynamic/bilibili.ts) 查看。

下面的记录是我们从 `DynamicBilibili` 函数中抽离出来的，主要记录了动态发布的一些关键步骤。

### 1. 打开动态发布页面

Bilibili 的动态发布页面是 `https://t.bilibili.com`，我们首先需要打开该页面；这一步在注入脚本的时候已经定义完成。

### 2. 找到标题和内容输入框并输入键入内容

进入到动态发布页面后，我们需要找到标题和内容输入框。

手动打开 Bilibili 的动态发布页面，然后打开 F12 的开发者工具，对着标题和内容输入框点击右键，选择 `检查` ，然后找到对应的元素。

通过审查元素，我们可以找到标题和内容输入框的元素如下：

```html
<div class="bili-dyn-publishing__title">
  <input
    maxlength="20"
    placeholder="好的标题更容易获得支持，选填20字"
    class="bili-dyn-publishing__title__input"
  />
  <div
    class="bili-dyn-publishing__title__helper"
    style="display: none;"
  >
    <div class="bili-dyn-publishing__title__clear"><div class="bili-dyn-publishing__title__close"></div></div>
    <div class="bili-dyn-publishing__title__indicator">0</div>
  </div>
</div>
```

```html
<div class="bili-dyn-publishing__input">
  <div
    class="bili-rich-textarea"
    style="max-height: 180px;"
  >
    <div
      placeholder="有什么想和大家分享的？"
      contenteditable="true"
      class="bili-rich-textarea__inner empty"
      style="font-size: 15px; line-height: 24px; min-height: 24px;"
    ></div>
  </div>
  <div
    class="bili-at-popup"
    style="left: 0px; top: 24px; display: none;"
  >
    <div class="bili-at-popup__hint">选择或输入你想@的人</div>
    <div class="bili-at-popup__list"></div>
  </div>
</div>
```

从上面的代码中，我们可以看到标题和内容输入框的关键元素分别是：

- 标题输入框：`<input maxlength="20" placeholder="好的标题更容易获得支持，选填20字" class="bili-dyn-publishing__title__input">`
- 内容输入框：`<div placeholder="有什么想和大家分享的？" contenteditable="true" class="bili-rich-textarea__inner empty" style="font-size: 15px; line-height: 24px; min-height: 24px;">​</div>`

为了向标题和内容输入框中输入内容，我们需要先找到这两个元素，然后向其输入内容。在代码中呈现如下

```ts
// 从传入的数据中解构出需要的字段
// content: 动态的文本内容
// images: 动态的图片内容（如果有）
// title: 动态的标题（如果有）
const { content, images, title } = data.data as DynamicData;

// 等待 B站动态发布页面的内容编辑器加载完成
// 使用属性选择器定位到具有特定 placeholder 和 contenteditable 属性的 div 元素
// 这个元素是 B站的富文本编辑器容器
// waitForElement 函数会等待元素出现在页面上，然后返回该元素，具体实现可以参考 src/sync/dynamic/bilibili.ts 文件中的 waitForElement 函数
// 如果有看不懂的可以谷歌复习 HTML 的属性选择器
const editor = (await waitForElement(
  'div[placeholder="有什么想和大家分享的？"][contenteditable="true"]',
)) as HTMLDivElement;

// 模拟用户点击编辑器的行为，触发编辑器的聚焦事件
// 这一步是必要的，因为某些编辑器功能只有在获得焦点后才能正常工作
editor.focus();

// 清空编辑器当前的内容
// B站会自动缓存用户未发布的动态内容
// 为了避免内容混淆，需要先清空编辑器
editor.textContent = '';

// 将新的动态内容设置到编辑器中
// 如果 content 为空，则设置为空字符串
editor.textContent = content || '';

// 创建一个模拟用户输入的事件对象
// InputEvent 比普通的 Event 对象能更好地模拟真实的用户输入行为
// cancelable: true 表示事件可以被取消
// inputType: 'insertText' 表示这是一个文本插入操作
// data: 包含实际插入的文本内容
const inputEvent = new InputEvent('input', {
  bubbles: true,
  cancelable: true,
  inputType: 'insertText',
  data: content || '',
});

// 触发输入事件
// 这一步是必要的，因为 B站的编辑器需要通过这个事件来更新内部状态
// 包括字数统计、发布按钮状态等都依赖于这个事件
editor.dispatchEvent(inputEvent);

// 如果存在标题参数，则进行标题的输入处理
if (title) {
  // 等待标题输入框元素出现在页面上
  // 使用 CSS 选择器 'input.bili-dyn-publishing__title__input' 定位元素
  // 将返回的元素断言为 HTMLInputElement 类型以获得输入框特有的属性和方法
  const titleInput = (await waitForElement('input.bili-dyn-publishing__title__input')) as HTMLInputElement;

  // 触发输入框的聚焦事件，模拟用户点击输入框的行为
  titleInput.focus();

  // 设置输入框的值为传入的标题内容
  titleInput.value = title;

  // 创建并触发 input 事件
  // bubbles: true 表示事件会冒泡到父元素
  // 这是为了确保 B站的事件监听器能够捕获到输入事件
  titleInput.dispatchEvent(new Event('input', { bubbles: true }));

  // 创建并触发 change 事件
  // 当输入框的值发生变化时需要触发此事件
  // 这样可以确保 B站的表单验证和数据同步机制能够正常工作
  titleInput.dispatchEvent(new Event('change', { bubbles: true }));
}
```

### 3. 上传图片

在完成上述步骤后，我们需要上传图片。

对于一般的平台来说，上传图片是通过 `type="file"` 的 input 标签来上传图片的。

但是 Bilibili 的动态发布页面中无法直接找到 `type="file"` 的 input 标签。

为此我们认为这个 Input 可能被隐藏起来，并没有直接挂载到页面上。

为此我们通过创建内容脚本，监听 Input 的创建。 具体代码在 `src/contents/helper.ts` 文件中。

```ts
/* eslint-disable prefer-const */

export {};
import type { PlasmoCSConfig } from 'plasmo';

// Plasmo 内容脚本配置
export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'], // 匹配所有 URL，这样脚本可以在任何页面上运行
  world: 'MAIN', // 在主世界中执行，这样可以访问页面的 DOM 和 JavaScript 上下文
  run_at: 'document_start', // 在页面开始加载时就执行脚本，确保不会错过任何元素的创建
};

// 保存原始的 createElement 方法，以便后续调用
let originalCreateElement = document.createElement.bind(document);
// 存储所有创建的 input 元素的数组
export let createdInputs: HTMLInputElement[] = [];

// 重写 document.createElement 方法来监听 input 元素的创建
// 这样我们可以捕获到所有动态创建的 input 元素
document.createElement = function (tagName, options) {
  // 调用原始的 createElement 方法创建元素
  let element = originalCreateElement(tagName, options);
  // 如果创建的是 input 元素，则将其添加到数组中
  if (tagName.toLowerCase() === 'input') {
    createdInputs.push(element);
  }
  return element;
};

// 处理来自其他脚本的消息
function handleMessage(event: MessageEvent) {
  const data = event.data;

  // 如果是 B站动态上传图片的消息，则调用对应的处理函数
  if (data.type === 'BILIBILI_DYNAMIC_UPLOAD_IMAGES') {
    handleBilibiliImageUpload(event);
  }
  // 其他平台的处理逻辑可以在这里添加
}

// 添加消息事件监听器
window.addEventListener('message', handleMessage);
```

通过重写 `document.createElement` 方法，我们监听到了 `input` 标签的创建，然后通过 `createdInputs` 数组来存储创建的 `input` 标签。

在开发时，可以通过 `console.log(createdInputs)` 打印出创建的 `input` 标签。

在注入脚本后我们找到了被隐藏的 `input` 标签。接下来我们需要在发布的时候利用 `window.postMessage` 将文件传递给内容脚本。这也是为什么 `helper.ts` 文件中需要通过 `window.addEventListener('message', handleMessage);` 来监听 `message` 事件。

我们回到 `src/sync/dynamic/bilibili.ts` 文件中，在发布的时候利用 `window.postMessage` 将文件传递给内容脚本。

首先，因为 Bilibili 的动态发布页面会缓存上次未提交的图片，所以我们需要先清理已上传的图片。

```ts
// 清理已上传图片的函数
async function cleanUploadedImages(): Promise<void> {
  console.log('开始清理已上传的图片');

  // 最多清理 20 张图片，防止无限循环
  for (let i = 0; i < 20; i++) {
    // 每次操作间隔 1 秒，避免操作过快导致页面无响应
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 查找图片删除按钮
    // 使用 querySelector 获取第一个删除按钮
    const removeButton = document.querySelector('div.bili-pics-uploader__item__remove') as HTMLElement;

    // 如果没有找到删除按钮，说明已经没有更多图片需要清理
    if (!removeButton) {
      console.log(`没有找到更多图片，已清理 ${i} 张图片`);
      break;
    }

    // 模拟点击删除按钮
    removeButton.click();
    console.log(`已清理第 ${i + 1} 张图片`);
  }

  console.log('图片清理完成');
}

// 处理图片上传的主函数
export async function handleBilibiliImageUpload(event: MessageEvent) {
  // 防止重复处理图片上传
  if (isProcessingImage) {
    return;
  }
  isProcessingImage = true;
  const files = event.data.files;

  // 等待图片上传组件加载完成
  await waitForElement('.bili-dyn-publishing__image-upload');

  // 在所有已创建的 input 元素中查找图片上传输入框
  const uploadInput = createdInputs.find((input) => input.type === 'file' && input.name === 'upload');
  if (!uploadInput) {
    return;
  }

  // 创建 DataTransfer 对象用于模拟文件拖拽
  const dataTransfer = new DataTransfer();

  // 将所有图片文件添加到 DataTransfer 对象中
  files.forEach((file) => dataTransfer.items.add(file));
  // 将文件列表设置到上传输入框中
  uploadInput.files = dataTransfer.files;

  // 获取添加图片的按钮
  const addButton = document.querySelector('.bili-pics-uploader__add');

  // 临时禁用输入框，防止重复上传
  uploadInput.disabled = true;
  // 触发添加按钮的点击事件
  addButton?.dispatchEvent(new Event('click', { bubbles: true }));

  // 等待 1 秒确保点击事件已被处理
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 重新启用输入框并触发 change 事件
  uploadInput.disabled = false;
  uploadInput.dispatchEvent(new Event('change', { bubbles: true }));

  // 重置处理状态
  isProcessingImage = false;
}

// 检查图片上传是否完成的函数
async function checkImageUploadCompletion(
  expectedNewCount: number, // 预期新上传的图片数量
  initialCount: number, // 上传前的图片数量
  maxAttempts = 30, // 最大尝试次数，默认 30 次
  interval = 1000, // 每次检查的间隔时间，默认 1 秒
): Promise<void> {
  // 在最大尝试次数内循环检查
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 获取当前成功上传的图片数量
    const currentSuccessCount = document.querySelectorAll('div.bili-pics-uploader__item.success').length;
    // 计算新上传成功的图片数量
    const newlyUploadedCount = currentSuccessCount - initialCount;

    // 如果新上传的图片数量达到预期，则上传完成
    if (newlyUploadedCount === expectedNewCount) {
      console.log(`所有 ${expectedNewCount} 张新图片已成功上传`);
      return;
    }
    // 等待指定时间后再次检查
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // 如果超过最大尝试次数仍未完成，则输出警告信息
  const finalSuccessCount = document.querySelectorAll('div.bili-pics-uploader__item.success').length;
  const actualNewlyUploadedCount = finalSuccessCount - initialCount;
  console.warn(`图片上传检查超时：预期新增 ${expectedNewCount} 张，实际新增 ${actualNewlyUploadedCount} 张`);
}
```

### 4. 发布动态

在完成上述步骤后，我们需要对自动发布进行额外处理。具体为找到发布按钮，然后点击发布按钮。

具体代码在 `src/sync/dynamic/bilibili.ts` 文件中。

```ts
if (data.auto_publish) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const publishButton = document.querySelector('div.bili-dyn-publishing__action.launcher') as HTMLDivElement;
    if (publishButton) {
      publishButton.click();
      console.log('已点击发布按钮');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      window.location.reload();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
} else {
  // 如果不需要自动发布，则找到发布按钮，然后添加点击事件监听器，在监听到用户点击发布按钮后，刷新页面
  const publishButton = (await waitForElement('div.bili-dyn-publishing__action.launcher')) as HTMLDivElement;

  if (publishButton) {
    // 添加点击事件监听器
    publishButton.addEventListener('click', async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      window.location.reload();
    });
    console.log('已为发布按钮添加点击事件监听器');
  } else {
    console.log('未找到发布按钮');
  }
}
```

## 大功告成

至此，我们已经完成了 Bilibili 的动态发布功能。

Bilibili 的动态发布难点主要是在于图片上传的处理，因为缺少明显的 `type="file"` 的 input 标签。

为此我们通过重写 `document.createElement` 方法，监听到了 `input` 标签的创建，然后通过 `createdInputs` 数组来存储创建的 `input` 标签。

在发布的时候利用 `window.postMessage` 将文件传递给内容脚本。
