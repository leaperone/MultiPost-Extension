export {};
import type { PlasmoCSConfig } from 'plasmo';
import scrapeContent from './scraper/default';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_start',
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MULTIPOST_EXTENSION_REQUEST_SCRAPER_START') {
    const scrapeFunc = async () => {
      const articleData = await scrapeContent();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      sendResponse(articleData);
    };
    // 平滑滚动到页面底部
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });

    // 监听滚动完成事件
    const checkScrollEnd = () => {
      if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 2) {
        // 滚动完成，发送响应
        scrapeFunc();
      }
    };

    window.addEventListener('scroll', checkScrollEnd);

    // 设置超时，以防滚动没有触发完成事件
    setTimeout(() => {
      window.removeEventListener('scroll', checkScrollEnd);
      scrapeFunc();
    }, 5000); // 5秒后超时
  }
  return true; // 保持消息通道开放
});
