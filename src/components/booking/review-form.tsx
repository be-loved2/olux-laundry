'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { StarRatingInput } from '@/components/booking/star-rating-input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createReviewAction } from '@/server/actions/review';

export function ReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      toast.error('Select a star rating first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createReviewAction({ orderId, rating, comment });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Thanks for your feedback!');
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <StarRatingInput value={rating} onChange={setRating} />
      <Textarea
        placeholder="How was your experience?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit review'}
      </Button>
    </div>
  );
}
