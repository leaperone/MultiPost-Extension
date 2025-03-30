import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const isApiRequest = nextUrl.pathname.startsWith('/api');
  
  // 处理 API 请求
  if (isApiRequest) {
    return NextResponse.next();
  }

  // 克隆响应并添加自定义 header
  const response = NextResponse.next();
  response.headers.set('x-pathname', nextUrl.pathname);
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|favicon.ico).*)'],
}; 