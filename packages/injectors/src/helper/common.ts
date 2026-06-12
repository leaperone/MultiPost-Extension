export function waitForElement(selector: string, timeout = 5000): Promise<Element> {
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
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

export async function findElementByText(
  selector: string,
  text: string,
  maxRetries = 5,
  retryInterval = 1000,
): Promise<Element | null> {
  for (let i = 0; i < maxRetries; i++) {
    const elements = document.querySelectorAll(selector);
    const element = Array.from(elements).find((element) => element.textContent?.includes(text));

    if (element) {
      return element;
    }

    console.log(`未找到包含文本 "${text}" 的元素，尝试次数：${i + 1}`);
    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }

  console.error(`在 ${maxRetries} 次尝试后未找到包含文本 "${text}" 的元素`);
  return null;
}
