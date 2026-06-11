import { useState } from 'react'
import type { PlatformType } from '@shared/types'
import { PLATFORMS } from '@shared/constants'

// Platform icon component with fallback mechanism
export function PlatformIcon({
  platform,
  size = 20
}: {
  platform: PlatformType
  size?: number
}): React.ReactElement | null {
  const [faviconError, setFaviconError] = useState(false)
  const platformInfo = PLATFORMS[platform]

  if (!platformInfo) return null

  // Get first letter for fallback
  const fallbackLetter = platformInfo.name.charAt(0).toUpperCase()
  const fallbackStyle = {
    width: size,
    height: size,
    fontSize: size * 0.6,
    lineHeight: `${size}px`
  }

  // Platform favicons load directly from each site; iconify was dropped
  // because its online icon API fails silently (blank icon, no onError).
  if (platformInfo.faviconUrl && !faviconError) {
    return (
      <img
        src={platformInfo.faviconUrl}
        alt={platformInfo.name}
        width={size}
        height={size}
        className="rounded-sm object-contain"
        referrerPolicy="no-referrer"
        onError={() => setFaviconError(true)}
      />
    )
  }

  // Final fallback: first letter of platform name
  return (
    <div
      className="flex items-center justify-center rounded bg-muted text-muted-foreground font-medium"
      style={fallbackStyle}
    >
      {fallbackLetter}
    </div>
  )
}
