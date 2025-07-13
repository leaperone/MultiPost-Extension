import type { DynamicData, SyncData } from '../common';

interface OkjikeConfig {
  selectedTopic: string;
  historyTopics: string[];
}

// 优先发布图文
export async function DynamicOkjike(data: SyncData) {
  const { title, content, images } = data.data as DynamicData;
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

  // 辅助函数：处理话题选择
  async function handleTopicSelection(topic: string) {
    const topicInput = (await waitForElement('input[placeholder="未选择圈子"]')) as HTMLInputElement;
    if (!topicInput) {
      console.error('未找到话题输入框');
      return;
    }

    // 点击输入框以显示下拉列表
    topicInput.click();

    topicInput.value = topic;
    topicInput.dispatchEvent(new Event('change', { bubbles: true }));
    topicInput.dispatchEvent(new Event('input', { bubbles: true }));

    // 等待下拉列表出现
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 在指定的父元素内查找话题
    const topicContainer = document.querySelector('div[name="topic"]');
    if (!topicContainer) {
      console.error('未找到话题容器');
      return;
    }

    // 查找所有可点击的话题元素
    const topicElements = Array.from(topicContainer.querySelectorAll('div[tabindex="0"]'));

    // 首先尝试找到指定的话题
    let topicItem = topicElements.find((element) => element.textContent?.trim() === topic.trim());

    // 如果没找到指定话题，选择第一个可用的话题
    if (!topicItem && topicElements.length > 0) {
      console.log('未找到指定话题，选择第一个可用话题');
      topicItem = topicElements[0];
    }

    console.log('选择的话题元素:', topicItem);

    if (topicItem) {
      (topicItem as HTMLElement).click();
    } else {
      console.error('没有找到任何可用的话题');
    }
  }

  // 填写内容
  async function fillContent() {
    const inputElement = (await waitForElement('div[contenteditable="true"][role="textbox"]')) as HTMLDivElement;
    const fullContent = `${title}\n${content}`;
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/plain', fullContent);
    inputElement.focus();
    inputElement.dispatchEvent(pasteEvent);
  }

  // 修改文件上传函数
  async function uploadFiles() {
    let fileInput: HTMLInputElement | null = null;

    fileInput = document.querySelector('input[type="file"]');

    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();
    const files = images || [];

    for (const fileInfo of files) {
      try {
        const response = await fetch(fileInfo.url);
        if (!response.ok) throw new Error(`HTTP 错误! 状态: ${response.status}`);

        const blob = await response.blob();
        const file = new File([blob], fileInfo.name, { type: fileInfo.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error(`上传文件失败:`, error);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // 主流程
  try {
    await fillContent();

    if (images && images.length > 0) {
      await uploadFiles();
    }

    const platform = data.platforms.find((p) => p.name === 'DYNAMIC_OKJIKE');
    const selectedTopic = (platform?.extraConfig as OkjikeConfig)?.selectedTopic || '';
    if (selectedTopic) {
      await handleTopicSelection(selectedTopic);
    }

    if (data.isAutoPublish) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const buttons = document.querySelectorAll('button');
      const publishButton = Array.from(buttons).find(
        (button) => button.textContent?.includes('发送'),
      ) as HTMLButtonElement;

      if (publishButton) {
        let attempts = 0;
        while (publishButton.disabled && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          attempts++;
          console.log(`等待发布按钮可用... 尝试 ${attempts}/10`);
        }

        if (publishButton.disabled) {
          console.error('发布按钮在10次尝试后仍被禁用');
          return;
        }

        console.log('点击发布按钮');
        publishButton.click();
      }
    }
  } catch (error) {
    console.error('发布过程中出错:', error);
  }
}
