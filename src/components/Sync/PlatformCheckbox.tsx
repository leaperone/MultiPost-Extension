import { Image, Checkbox, Link } from '@heroui/react';
import type { PlatformInfo } from '~sync/common';
import React from 'react';
import { Icon } from '@iconify/react';

interface PlatformCheckboxProps {
  platformInfo: PlatformInfo;
  isSelected: boolean;
  isDisabled?: boolean;
  onChange: (key: string, isSelected: boolean) => void;
}

export default function PlatformCheckbox({ platformInfo, isSelected, isDisabled, onChange }: PlatformCheckboxProps) {
  const hasUserInfo = platformInfo.username && platformInfo.userAvatarUrl;

  return (
    <div className="flex items-center justify-between p-1 hover:bg-default-100 rounded-lg transition-colors">
      <div className="flex items-center gap-1">
        <Checkbox
          isSelected={isSelected}
          isDisabled={isDisabled}
          onChange={(e) => onChange(platformInfo.name, e.target.checked)}
          size="sm"
          className="mr-0.5">
          <div className="flex items-center gap-1">
            {platformInfo.iconifyIcon ? (
              <Icon
                icon={platformInfo.iconifyIcon}
                className="w-4 h-4"
              />
            ) : (
              platformInfo.faviconUrl && (
                <Image
                  src={platformInfo.faviconUrl}
                  alt={platformInfo.platformName}
                  width={16}
                  height={16}
                  className="rounded-sm"
                />
              )
            )}
            <Link
              href={platformInfo.homeUrl}
              isExternal
              className="text-foreground hover:text-primary transition-colors">
              <span className="text-xs font-medium truncate">{platformInfo.platformName}</span>
            </Link>
          </div>
        </Checkbox>
      </div>

      {hasUserInfo && (
        <div className="flex items-center gap-1 px-1">
          <Image
            src={platformInfo.userAvatarUrl}
            alt={`${platformInfo.platformName}用户头像`}
            width={16}
            height={16}
            className="rounded-full"
          />
          <span className="text-xs text-default-600 truncate max-w-[60px]">{platformInfo.username}</span>
        </div>
      )}
    </div>
  );
}
