import { Readability } from '@mozilla/readability';
import { preprocessor } from './preprocessor';
import scrapeCSDNContent from './csdn';

export interface ArticleData {
  title: string;
  author: string;
  cover: string;
  content: string;
  digest: string;
}

export default async function scrapeContent(): Promise<ArticleData | undefined> {
  const hostname = window.location.hostname;

  // 针对不同域名使用不同的scraper
  const scraperMap: { [key: string]: () => Promise<ArticleData | undefined> } = {
    'blog.csdn.net': scrapeCSDNContent,
    // 添加更多域名和scraper函数
  };

  const scraper = scraperMap[hostname];
  if (scraper) {
    return scraper();
  }

  return defaultScraper();
}

async function defaultScraper(): Promise<ArticleData | undefined> {
  console.debug('default spider ...');

  const preprocess = (content: string) => preprocessor(content);

  const article = new Readability(document.cloneNode(true) as Document).parse();

  console.debug('Readability article -->', article);

  if (!article?.content || !article?.title) {
    // alert(chrome.i18n.getMessage("failedToGetArticleContent"));
    console.log('failedToGetArticleContent');
    return;
  }

  const cover = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  const title = article.title || '';

  console.debug('title ', title);

  const content = article.content || '';
  const excerpt = article.excerpt || '';

  const articleData: ArticleData = {
    title: title.trim(),
    author: '',
    cover,
    content: preprocess(content.trim()),
    digest: excerpt.trim(),
  };

  return articleData;
  
}
