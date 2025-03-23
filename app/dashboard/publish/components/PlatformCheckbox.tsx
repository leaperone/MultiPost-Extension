import { Checkbox, Image } from '@heroui/react';
import type { PlatformInfo } from '@/types/platform';

interface PlatformCheckboxProps {
  platformInfo: PlatformInfo;
  isSelected: boolean;
  onChange: (key: React.Key, isSelected: boolean) => void;
  isDisabled?: boolean;
}

export default function PlatformCheckbox({
  platformInfo,
  isSelected,
  onChange,
  isDisabled = false,
}: PlatformCheckboxProps) {
  return (
    <Checkbox
      key={platformInfo.name}
      isSelected={isSelected}
      onValueChange={(isSelected) => onChange(platformInfo.name, isSelected)}
      isDisabled={isDisabled}
      className="min-w-0">
      <div className="flex items-center gap-2">
        {platformInfo.faviconUrl && (
          <Image
            src={platformInfo.faviconUrl}
            alt={platformInfo.platformName}
            width={16}
            height={16}
            className="rounded-sm"
          />
        )}
        <span className="text-sm">{platformInfo.platformName}</span>
      </div>
    </Checkbox>
  );
}
