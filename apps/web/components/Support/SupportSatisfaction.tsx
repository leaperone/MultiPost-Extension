'use client';

import { useState } from 'react';

import { rateConversation } from '@/actions/support';
import { useTranslation } from '@/i18n/client';
import { Button, Textarea, addToast } from '@heroui/react';
import { Star } from 'lucide-react';

interface SupportSatisfactionProps {
  conversationId: string;
  onRated: () => void;
}

export default function SupportSatisfaction({ conversationId, onRated }: SupportSatisfactionProps) {
  const { t } = useTranslation('support');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1) {
      addToast({ title: t('satisfaction.selectRating'), hideIcon: true });
      return;
    }

    setSubmitting(true);
    try {
      const result = await rateConversation(conversationId, rating, comment || undefined);
      if (result.success) {
        addToast({ title: t('satisfaction.thankYou'), hideIcon: true });
        onRated();
      } else {
        addToast({ title: result.error || t('satisfaction.failed'), hideIcon: true });
      }
    } catch {
      addToast({ title: t('satisfaction.failedRetry'), hideIcon: true });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="border rounded-lg p-4 mx-4 mb-4">
      <p className="text-sm font-medium text-foreground mb-3">{t('satisfaction.prompt')}</p>

      {/* Star rating */}
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="transition-transform hover:scale-110"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <Star
              className={`size-6 transition-colors ${
                star <= displayRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Optional comment */}
      <Textarea
        placeholder={t('satisfaction.commentPlaceholder')}
        maxLength={500}
        value={comment}
        onValueChange={setComment}
        minRows={2}
        maxRows={4}
        className="mb-3"
      />

      <Button
        size="sm"
        onPress={handleSubmit}
        isLoading={submitting}
        isDisabled={rating < 1}
      >
        {t('satisfaction.submit')}
      </Button>
    </div>
  );
}
