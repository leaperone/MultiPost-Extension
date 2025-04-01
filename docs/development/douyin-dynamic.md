# 抖音图文动态发布脚本开发记录

## 在对应位置添加平台

在 `src/sync/dynamic.ts` 文件中注册 `Douyin` 平台的动态发布。

```ts
  DYNAMIC_DOUYIN: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_DOUYIN',
    homeUrl: 'https://creator.douyin.com/',
    faviconUrl: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico',
    platformName: chrome.i18n.getMessage('platformDouyin'),
    injectUrl: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
    injectFunction: DynamicDouyin,
    tags: ['CN'],
    accountKey: 'douyin',
  },
```

injectUrl 是抖音图文动态发布页面，我们之后的脚本会在这个页面进行执行。其中 default-tab=3 是图文动态发布页面。

我们在开发脚本的时候应该尽可能减少脚本方面的操作。例如在本例中，抖音的实际发布页面可以是 `https://creator.douyin.com/creator-micro/content/upload`，但是这样进去的默认发布页面是视频发布页面，而不是图文发布页面，需要在脚本中找到图文发布的按钮并点击来切换到图文发布，会比较复杂。而直接利用 query 参数 `default-tab=3` 来打开的页面默认就是图文发布页面，这样我们就可以减少脚本方面的操作。

## 动态发布函数

动态发布函数是动态发布功能的核心，该函数会根据 `injectUrl` 打开的页面然后将其注入到页面中。

### 1. 上传图片

在做抖音图文发布的时候，我们首先需要上传图片。

我们利用审查元素发现抖音的图片上传组件是一个 `input` 标签，类型为 `file`，并且 `accept` 属性为 `image/png,image/jpeg,image/jpg,image/bmp,image/webp,image/tif`，并且 `multiple` 属性为 `true`。

我们首先使用 `waitForElement` 方法来等待图片上传组件加载完成。而后我们创建一个 `DataTransfer` 对象，用于模拟文件拖拽。

而后我们遍历 `images` 数组，将图片文件添加到 `DataTransfer` 对象中。

最后我们设置 `fileInput` 的 `files` 属性为 `DataTransfer` 对象的 `files` 属性，并触发 `change` 事件。

```ts
async function uploadImages() {
  const fileInput = (await waitForElement(
    'input[accept="image/png,image/jpeg,image/jpg,image/bmp,image/webp,image/tif"][multiple][type="file"]',
  )) as HTMLInputElement;
  if (!fileInput) {
    console.error('未找到文件输入元素');
    return;
  }

  const dataTransfer = new DataTransfer();

  for (const fileInfo of images) {
    try {
      const response = await fetch(fileInfo.url);
      if (!response.ok) {
        throw new Error(`HTTP 错误! 状态: ${response.status}`);
      }
      const blob = await response.blob();
      const file = new File([blob], fileInfo.name, { type: fileInfo.type });
      dataTransfer.items.add(file);
    } catch (error) {
      console.error(`上传图片 ${fileInfo.url} 失败:`, error);
    }
  }

  if (dataTransfer.files.length > 0) {
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待文件处理
    console.log('文件上传操作完成');
  } else {
    console.error('没有成功添加任何文件');
  }
}
```

### 2. 输入内容

在上传图片完成后，抖音会自动跳转到内容编辑页面，因此我们需要只需要等待内容编辑组件加载完成并等待输入框加载。

我们利用审查元素发现抖音的标题输入框是一个 `input` 标签，并且 `placeholder` 属性为 `添加作品标题`。

我们首先使用 `waitForElement` 方法来等待标题输入框加载完成。而后我们设置标题输入框的 `value` 属性为 `title` 或 `content.slice(0, 20)`，并触发 `input` 事件。

我们利用审查元素发现抖音的内容编辑组件是一个 `div` 标签，并且 `data-line-wrapper="true"` 属性为 `true`。

我们同样使用 `waitForElement` 方法来等待内容编辑组件加载完成。而后我们创建一个 `ClipboardEvent` 对象，用于模拟粘贴事件。

我们设置剪贴板数据为 `content`，并触发粘贴事件。

```ts
// 填写标题
const titleInput = (await waitForElement('input[placeholder="添加作品标题"]')) as HTMLInputElement;
if (titleInput) {
  titleInput.value = title || content.slice(0, 20);
  titleInput.dispatchEvent(new Event('input', { bubbles: true }));
}

// 填写内容
const contentEditor = (await waitForElement('div[data-line-wrapper="true"]')) as HTMLDivElement;
if (contentEditor) {
  // 创建一个新的 ClipboardEvent
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer(),
  });

  // 设置剪贴板数据
  pasteEvent.clipboardData.setData('text/plain', content);

  // 触发粘贴事件
  contentEditor.dispatchEvent(pasteEvent);
}
```

### 3. 图片上传检查

在自动发布之前，我们需要检查图片是否完成上传。

我们利用 querySelectorAll 方法来获取所有 `span` 标签，并检查 `span` 标签的文本是否为 `查看`。

如果 `span` 标签的文本为 `查看`，则表示图片上传完成，通过比对 `span` 标签的数量和 `images` 数组的长度来判断图片是否完成上传。

```ts
async function checkImagesUploaded(expectedCount: number, maxRetries = 10, retryInterval = 3000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const viewTexts = document.querySelectorAll('span:contains("查看")');
    const imageCount = viewTexts.length;

    console.log(`当前找到 ${imageCount} 个 "查看" 文本，期望数量：${expectedCount}`);

    if (imageCount === expectedCount) {
      console.log('图片上传完成');
      return true;
    }

    console.log(`图片上传未完成，等待中...（尝试次数：${i + 1}）`);
    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }

  console.error(`在 ${maxRetries} 次尝试后，图片上传仍未完成`);
  return true;
}
```

### 4. 自动发布

在完成上述步骤后，我们需要对自动发布进行额外处理。具体为找到发布按钮，然后点击发布按钮。

我们利用 `findElementByText` 方法来获取发布按钮，并点击发布按钮。

```ts
const publishButton = (await findElementByText('button', '发布', 5, 1000)) as HTMLButtonElement;
if (publishButton) {
  publishButton.click();
  console.log('发布按钮已点击');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  window.location.href = 'https://creator.douyin.com/creator-micro/content/manage';
}
```

findElementByText 方法是通过获取元素的文本内容来查找元素的。

在发布成功后，我们跳转到 `https://creator.douyin.com/creator-micro/content/manage` 页面，并刷新页面。

## 大功告成

至此，我们已经完成了抖音图文动态发布脚本的开发。

抖音的开发比较简单快捷，我们只需要利用 `waitForElement` 方法来等待元素加载完成，对编辑器进行输入，然后利用 `findElementByText` 方法来获取到发布按钮，并点击按钮发布即可。

