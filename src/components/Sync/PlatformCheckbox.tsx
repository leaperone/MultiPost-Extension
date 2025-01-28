import { Image, Checkbox, Link } from '@nextui-org/react';
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
    <div className="flex items-center space-x-1">
      <Checkbox
        isSelected={isSelected}
        isDisabled={isDisabled}
        onChange={(e) => onChange(platformInfo.name, e.target.checked)}>
        <div className="flex items-center space-x-1">
          {platformInfo.iconifyIcon ? (
            <Icon icon={platformInfo.iconifyIcon} />
          ) : (
            platformInfo.faviconUrl && (
              <Image
                src={platformInfo.faviconUrl}
                alt={platformInfo.platformName}
                width={20}
                height={20}
                className="rounded-none"
              />
            )
          )}
          <Link
            href={platformInfo.homeUrl}
            isExternal
            className="text-foreground">
            <span className="text-sm font-medium">{platformInfo.platformName}</span>
          </Link>
        </div>
      </Checkbox>
      {hasUserInfo && (
        <div className="flex items-center space-x-1">
          <Image
            src={platformInfo.userAvatarUrl}
            alt={`${platformInfo.platformName}用户头像`}
            width={20}
            height={20}
          />
          <span className="text-sm text-default-500">{platformInfo.username}</span>
        </div>
      )}
    </div>
  );
}
