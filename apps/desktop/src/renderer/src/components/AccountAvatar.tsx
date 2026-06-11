import { useState } from 'react'
import type { PlatformType } from '@shared/types'
import { PlatformIcon } from './PlatformIcon'

interface AccountAvatarProps {
  avatar?: string
  platform: PlatformType
  /** Avatar diameter in px */
  size?: number
  className?: string
  /** Show the platform icon as a corner badge when a real avatar is rendered */
  showPlatformBadge?: boolean
}

/**
 * Account avatar with graceful degradation: real avatar (detected from the
 * platform session) when available, platform icon as fallback. Remote avatar
 * URLs can expire or be hotlink-protected, so a load error also falls back.
 */
export function AccountAvatar({
  avatar,
  platform,
  size = 48,
  className = '',
  showPlatformBadge = true
}: AccountAvatarProps): React.ReactElement {
  // Track which URL failed so a refreshed avatar URL gets a fresh attempt
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(avatar) && failedSrc !== avatar
  const iconSize = Math.round(size * 0.55)
  const badgeSize = Math.max(14, Math.round(size * 0.42))

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-foreground/[0.05] ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={avatar}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full rounded-full object-cover"
          onError={() => setFailedSrc(avatar ?? null)}
        />
      ) : (
        <PlatformIcon platform={platform} size={iconSize} />
      )}
      {showImage && showPlatformBadge && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-background bg-background shadow-sm"
          style={{ width: badgeSize, height: badgeSize }}
        >
          <PlatformIcon platform={platform} size={Math.round(badgeSize * 0.7)} />
        </span>
      )}
    </span>
  )
}
