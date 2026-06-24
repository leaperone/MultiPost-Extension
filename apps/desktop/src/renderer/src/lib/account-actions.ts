import { toast } from '../components/ui/sonner'

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error.trim()) {
    return error
  }
  return '请检查网络后重试。'
}

export async function openAccountBrowser(accountId: string, url?: string): Promise<void> {
  try {
    await window.api.browser.open(accountId, url)
  } catch (error) {
    console.error('Failed to open account browser:', error)
    toast.error('账号页面没打开', {
      description: formatErrorMessage(error)
    })
  }
}
