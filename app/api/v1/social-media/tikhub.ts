const TIKHUB_API_KEY = process.env.TIKHUB_API_KEY;

export async function fetchTikhub(
  method: string,
  endpoint: string,
  params?: Record<string, string | number | boolean>,
) {
  try {
    const response = await fetch(`https://api.tikhub.io/api${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${TIKHUB_API_KEY}`,
      },
      body: params ? JSON.stringify(params) : undefined,
    });
    if (!response.ok) {
      throw new Error('Internal Server Error');
    }

    const data = await response.json();

    if (data.code !== 200) {
      throw new Error('Something went wrong, please try again later');
    }

    return data;
  } catch (error) {
    console.error('Error fetching TikHub API:', error);
    throw error;
  }
}
