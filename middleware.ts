import { NextRequest, NextResponse } from 'next/server';

const DOCS_LANGUAGES = ['zh', 'en'];
const DEFAULT_DOCS_LANG = 'zh';

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const isApiRequest = nextUrl.pathname.startsWith('/api');

  // 处理 API 请求
  if (isApiRequest) {
    return NextResponse.next();
  }

  // Handle /docs paths without language prefix
  if (nextUrl.pathname.startsWith('/docs/')) {
    const pathParts = nextUrl.pathname.split('/').filter(Boolean); // ['docs', 'user-guide', 'contact-us']

    if (pathParts.length >= 2) {
      const possibleLang = pathParts[1];

      // If second segment is not a valid language, redirect with default language
      if (!DOCS_LANGUAGES.includes(possibleLang)) {
        const slug = pathParts.slice(1).join('/'); // 'user-guide/contact-us'
        const newUrl = new URL(`/docs/${DEFAULT_DOCS_LANG}/${slug}`, request.url);
        return NextResponse.redirect(newUrl);
      }
    }
  }

  // 克隆响应并添加自定义 header
  const response = NextResponse.next();
  response.headers.set('x-pathname', nextUrl.pathname);

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|favicon.ico).*)'],
}; 