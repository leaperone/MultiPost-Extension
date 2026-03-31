import { NextResponse } from 'next/server';

export const revalidate = 86400; // 缓存1天

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tag = url.searchParams.get('tag') || 'poster';

  try {
    const response = await fetch(`https://api.seede.ai/shared/template/tag/${tag}`, {
      headers: {
        authorization: process.env.SEEDE_API_TOKEN!,
        'content-type': 'application/json',
      },
      next: { revalidate },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取模板失败',
      },
      { status: 500 },
    );
  }
}
