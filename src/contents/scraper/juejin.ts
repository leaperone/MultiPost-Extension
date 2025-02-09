import type { ArticleData } from './default';
import { preprocessor } from './preprocessor';

export default async function scrapeJuejinContent(): Promise<ArticleData | undefined> {
  console.debug('juejin spider ...');

  const cover = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  const title = document.querySelector('meta[itemprop="headline"]')?.getAttribute('content') || '';

  console.debug('title ', title);

  const author = document.querySelector('.author-name')?.textContent || '';
  const content = document.querySelector('#article-root')?.innerHTML || '';
  const digest = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  if (!title || !content) {
    console.log('failedToGetArticleContent');
    return;
  }

  // 处理简书文章特有的内容
  const processContent = (htmlContent: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 处理图片
    const images = doc.getElementsByTagName('img');
    Array.from(images).forEach((img) => {
      // 设置referrerpolicy
      if (!img.getAttribute('referrerpolicy')) {
        img.setAttribute('referrerpolicy', 'no-referrer');
      }

      // 处理data-src
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) {
        img.setAttribute('src', dataSrc);
      }
    });

    // 移除代码块扩展头部
    const codeBlockHeaders = doc.querySelectorAll('div.code-block-extension-header');
    codeBlockHeaders.forEach((header) => header.remove());

    return preprocessor(doc.body.innerHTML);
  };

  const articleData: ArticleData = {
    title: title.trim(),
    author: author.trim(),
    cover,
    content: processContent(content.trim()),
    digest: digest.trim(),
  };

  return articleData;
}
