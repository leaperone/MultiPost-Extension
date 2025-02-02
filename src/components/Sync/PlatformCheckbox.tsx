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
    <div className="flex items-center justify-between p-2 hover:bg-default-100 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <Checkbox
          isSelected={isSelected}
          isDisabled={isDisabled}
          onChange={(e) => onChange(platformInfo.name, e.target.checked)}
          className="mr-1">
          <div className="flex items-center gap-2">
            {platformInfo.iconifyIcon ? (
              <Icon
                icon={platformInfo.iconifyIcon}
                className="w-5 h-5"
              />
            ) : (
              platformInfo.faviconUrl && (
                <Image
                  src={platformInfo.faviconUrl}
                  alt={platformInfo.platformName}
                  width={20}
                  height={20}
                  className="rounded-sm"
                />
              )
            )}
            <Link
              href={platformInfo.homeUrl}
              isExternal
              className="text-foreground hover:text-primary transition-colors">
              <span className="text-sm font-semibold">{platformInfo.platformName}</span>
            </Link>
          </div>
        </Checkbox>
      </div>

      {hasUserInfo && (
        <div className="flex items-center gap-2 px-2">
          <Image
            src={platformInfo.userAvatarUrl}
            alt={`${platformInfo.platformName}用户头像`}
            width={24}
            height={24}
            className="rounded-full"
          />
          <span className="text-sm text-default-600">{platformInfo.username}</span>
        </div>
      )}
    </div>
  );
}
