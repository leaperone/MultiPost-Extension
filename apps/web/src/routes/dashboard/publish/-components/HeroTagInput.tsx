'use client';

import React from 'react';
import { Button, Chip, Input } from '@heroui/react';
import { PlusIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import { cn } from '@/lib/utils';

interface HeroTagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

const HeroTagInput = React.forwardRef<HTMLInputElement, HeroTagInputProps>(
  ({ value, onChange, placeholder, className, ...props }, ref) => {
    const { t } = useTranslation('publish');

    const [inputValue, setInputValue] = React.useState('');

    const addTag = () => {
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
        setInputValue('');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag();
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    };

    const removeTag = (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove));
    };

    return (
      <div
        className={cn(
          'mt-4 flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md bg-transparent px-0 py-2 text-sm',
          className,
        )}>
        {value.map((tag) => (
          <Chip
            key={tag}
            size="sm"
            variant="flat"
            color="primary"
            onClose={() => removeTag(tag)}
            className="text-sm">
            {tag}
          </Chip>
        ))}
        <div className="flex flex-1 items-center">
          <Input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="underlined"
            className="flex-1 px-0"
            placeholder={value.length === 0 ? placeholder : ''}
            classNames={{
              input: 'text-foreground/90',
            }}
            {...props}
          />
          {inputValue.trim() && (
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={addTag}
              title={t('video.addTag', '添加标签')}>
              <PlusIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
    );
  },
);
HeroTagInput.displayName = 'HeroTagInput';

export default HeroTagInput;
