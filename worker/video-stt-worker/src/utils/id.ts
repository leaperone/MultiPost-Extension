/**
 * Generate a unique ID for jobs
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `job_${timestamp}_${randomStr}`;
}
