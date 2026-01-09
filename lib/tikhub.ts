const TIKHUB_API_KEY = process.env.TIKHUB_API_KEY;
const TIKHUB_BASE_URL = process.env.TIKHUB_BASE_URL || 'https://api.tikhub.dev';

export async function fetchTikhub(
  method: string,
  endpoint: string,
  params?: Record<string, string | number | boolean>,
) {
  const url = `${TIKHUB_BASE_URL}/api${endpoint}`;

  try {
    console.log(`[TikHub] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${TIKHUB_API_KEY}`,
      },
      body: params ? JSON.stringify(params) : undefined,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TikHub] Error ${response.status}: ${errorText}`);
      throw new Error(`TikHub API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // TikHub API returns code 0 for success, not 200
    if (data.code !== 0 && data.code !== 200) {
      console.error('TikHub API response error:', data);
      throw new Error(data.message || 'Something went wrong, please try again later');
    }

    return data;
  } catch (error) {
    console.error('Error fetching TikHub API:', error);
    throw error;
  }
}
