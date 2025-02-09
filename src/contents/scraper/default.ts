import { Readability } from '@mozilla/readability';
import { preprocessor } from './preprocessor';
import scrapeCSDNContent from './csdn';
import scrapeZhihuContent from './zhihu';
import scrapeWeixinContent from './wechat';

export interface ArticleData {
  title: string;
  author: string;
  cover: string;
  content: string;
  digest: string;
}

export default async function scrapeContent(): Promise<ArticleData | undefined> {
  const url = window.location.href;

  // 针对不同网址开头使用不同的scraper
  const scraperMap: { [key: string]: () => Promise<ArticleData | undefined> } = {
    'https://blog.csdn.net/': scrapeCSDNContent,
    'https://zhuanlan.zhihu.com/p/': scrapeZhihuContent,
    'https://mp.weixin.qq.com/s/': scrapeWeixinContent,
  };

  const scraper = Object.keys(scraperMap).find((key) => url.startsWith(key));
  if (scraper) {
    return scraperMap[scraper]();
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

