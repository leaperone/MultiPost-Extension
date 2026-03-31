import { useState, useEffect } from 'react'
import type { Account } from '../../../shared/types'

interface BrowserPanelProps {
  account: Account
}

export function BrowserPanel({ account }: BrowserPanelProps): React.ReactElement {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Listen for navigation events
    const unsubNavigate = window.api.browser.onNavigated((data) => {
      if (data.accountId === account.id) {
        setUrl(data.url)
        setIsLoading(false)
      }
    })

    const unsubTitle = window.api.browser.onTitleChanged((data) => {
      if (data.accountId === account.id) {
        setTitle(data.title)
      }
    })

    return () => {
      unsubNavigate()
      unsubTitle()
    }
  }, [account.id])

  const handleNavigate = async () => {
    if (!url) return
    setIsLoading(true)
    try {
      await window.api.browser.navigate(account.id, url)
    } catch (error) {
      console.error('Navigation failed:', error)
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!url) return
    setIsLoading(true)
    try {
      await window.api.browser.navigate(account.id, url)
    } catch (error) {
      console.error('Refresh failed:', error)
      setIsLoading(false)
    }
  }

  const handleCheckLogin = async () => {
    try {
      const isLoggedIn = await window.api.browser.getLoginStatus(account.id)
      if (isLoggedIn) {
        await window.api.account.update(account.id, {
          isLoggedIn: true,
          lastLoginAt: Date.now()
        })
        alert('已检测到登录状态！')
      } else {
        alert('未检测到登录状态，请先登录')
      }
    } catch (error) {
      console.error('Failed to check login status:', error)
    }
  }

  return (
    <div className="browser-panel">
      <div className="browser-toolbar">
        <button
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={isLoading}
          style={{ padding: '4px 8px' }}
        >
          {isLoading ? '...' : '↻'}
        </button>
        <input
          type="text"
          className="url-bar"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
          placeholder="输入网址..."
        />
        <button
          className="btn btn-secondary"
          onClick={handleNavigate}
          disabled={isLoading}
          style={{ padding: '4px 12px' }}
        >
          前往
        </button>
        <button
          className="btn btn-primary"
          onClick={handleCheckLogin}
          style={{ padding: '4px 12px' }}
        >
          检测登录
        </button>
      </div>
      {/* The actual BrowserView is rendered by Electron, not React */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        {title && <span style={{ fontSize: '12px' }}>{title}</span>}
      </div>
    </div>
  )
}
