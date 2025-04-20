import { Checkbox, Image, Link } from '@heroui/react';
import type { PlatformInfo } from '@/lib/extension';
import { Icon } from '@iconify/react';
import ExtraInfoConfig from './ExtraInfoConfig';

interface PlatformCheckboxProps {
  platformInfo: PlatformInfo;
  isSelected: boolean;
  onChange: (key: React.Key, isSelected: boolean) => void;
  isDisabled?: boolean;
  onExtraConfigChange: (platformKey: string, extraConfig: unknown) => void;
}

export default function PlatformCheckbox({
  platformInfo,
  isSelected,
  isDisabled,
  onChange,
  onExtraConfigChange,
}: PlatformCheckboxProps) {
  const profileUrl = platformInfo.accountInfo?.profileUrl || platformInfo.homeUrl;

  return (
    <div className="flex items-center rounded-lg p-2 transition-colors hover:bg-default-100">
      <div className="flex flex-1 items-center gap-2">
        <Checkbox
          isSelected={isSelected}
          isDisabled={isDisabled}
          onChange={(e) => onChange(platformInfo.name, e.target.checked)}
          size="sm"
        />

        <div className="flex items-center gap-1.5">
          {platformInfo.iconifyIcon ? (
            <Icon
              icon={platformInfo.iconifyIcon}
              className="size-5"
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

          <div className="flex items-center gap-2">
            <Link
              href={platformInfo.homeUrl}
              isExternal
              className="text-foreground transition-colors hover:text-primary">
              <span className="truncate text-sm font-medium">{platformInfo.platformName}</span>
            </Link>

            {platformInfo.accountInfo && (
              <div className="flex items-center gap-1">
                {platformInfo.accountInfo.avatarUrl && (
                  <Image
                    src={platformInfo.accountInfo.avatarUrl}
                    alt={`${platformInfo.platformName} avatar`}
                    width={18}
                    height={18}
                    className="rounded-full"
                  />
                )}
                <Link
                  href={profileUrl}
                  isExternal
                  className="flex max-w-[120px] items-center gap-1 truncate text-xs text-default-600 hover:text-primary">
                  {platformInfo.accountInfo.username}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <ExtraInfoConfig
        platformInfo={platformInfo}
        onExtraConfigChange={onExtraConfigChange}
      />
    </div>
  );
}
