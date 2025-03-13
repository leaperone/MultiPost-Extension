import type { ArticleData, SyncData } from '~sync/common';

export async function ArticleDouban(data: SyncData) {
  console.debug('ArticleDouban', data);

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

  const articleData = data.data as ArticleData;

  // 填充文章内容
  async function fillArticleContent() {
    // 等待标题输入框出现
    const titleTextarea = (await waitForElement('textarea[placeholder="添加标题"]')) as HTMLTextAreaElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 设置标题
    titleTextarea.value = articleData.title?.slice(0, 100) || '';
    titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
    console.debug('titleTextarea', titleTextarea, titleTextarea.value);

    // 等待编辑器加载
    const editor = document.querySelector('div[data-contents="true"]') as HTMLDivElement;
    if (!editor) {
      console.debug('未找到编辑器元素');
      return false;
    }

    // 填充内容
    editor.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/html', articleData.originContent || '');
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 5000));
    return true;
  }

  // 发布文章
  async function publishArticle(): Promise<void> {
    const previewButton = document.querySelector('a.editor-extra-button-preview');
    console.debug('previewButton', previewButton);

    if (previewButton) {
      if (data.auto_publish) {
        console.debug('previewButton clicked');
        const clickEvent = new Event('click', { bubbles: true });
        previewButton.dispatchEvent(clickEvent);
      }
    } else {
      console.debug('未找到"预览"按钮');
    }
  }

  // 主流程
  try {
    const contentFilled = await fillArticleContent();
    if (!contentFilled) {
      throw new Error('填充文章内容失败');
    }

    await publishArticle();
  } catch (error) {
    console.error('发布文章失败:', error);
  }
}
