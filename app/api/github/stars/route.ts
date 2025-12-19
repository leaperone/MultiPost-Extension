import { NextResponse } from 'next/server';

export const runtime = 'edge';

// 缓存 1 天
export const revalidate = 86400;

export async function GET() {
  try {
    // 从 shields.io 的 JSON endpoint 获取 GitHub stars
    const response = await fetch(
      'https://img.shields.io/github/stars/leaperone/MultiPost-Extension.json',
      {
        next: { revalidate: 86400 }, // 1天缓存
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch stars count');
    }

    const data = await response.json();

    return NextResponse.json({
      stars: data.value || data.message || '1.2k',
      success: true,
    });
  } catch (error) {
    console.error('Error fetching GitHub stars:', error);
    return NextResponse.json(
      {
        stars: '1.2k',
        success: false,
      },
      { status: 200 }, // 返回 200 但带默认值
    );
  }
}
