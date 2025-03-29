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
  const profileUrl = platformInfo.accountInfo?.profileUrl || platformInfo.homeUrl;

  return (
    <div className="flex items-center justify-between p-2 hover:bg-default-100 rounded-lg transition-colors">
      <div className="flex items-center gap-1.5">
        <Checkbox
          isSelected={isSelected}
          isDisabled={isDisabled}
          onChange={(e) => onChange(platformInfo.name, e.target.checked)}
          size="sm"
          className="mr-0.5">
          <div className="flex items-center gap-1.5">
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
              <span className="text-sm font-medium truncate">{platformInfo.platformName}</span>
            </Link>
          </div>
        </Checkbox>
      </div>

      {platformInfo.accountInfo && (
        <div className="flex items-center gap-1.5">
          {platformInfo.accountInfo.avatarUrl && (
            <Image
              src={platformInfo.accountInfo.avatarUrl}
              alt={`${platformInfo.platformName}用户头像`}
              width={18}
              height={18}
              className="rounded-full"
            />
          )}
          <Link
            href={profileUrl}
            isExternal
            className="text-xs text-default-600 hover:text-primary truncate max-w-[120px] flex items-center gap-1">
            {platformInfo.accountInfo.username}
          </Link>
        </div>
      )}
    </div>
  );
}
