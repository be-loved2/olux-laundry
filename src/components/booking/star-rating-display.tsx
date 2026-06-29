import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

export function StarRatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-5 w-5',
            star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-none text-border',
          )}
        />
      ))}
    </div>
  );
}
