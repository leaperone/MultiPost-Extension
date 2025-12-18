import open from 'open';

export async function sendVerificationRequest({
  identifier: email,
  url,
}: {
  identifier: string;
  url: string;
}) {
  console.log(`${email} plz click here to authenticate - ${url}`);

  // 在开发模式下自动在浏览器中打开登录链接
  try {
    await open(url);
    console.log('✓ 已自动在浏览器中打开登录链接');
  } catch (error) {
    console.error('Failed to open browser:', error);
    console.log('请手动复制上面的链接到浏览器中打开');
  }
}
