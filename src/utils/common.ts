export async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`尝试失败，${maxRetries - attempt}次重试后重新尝试...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("重试次数已达上限");
}
