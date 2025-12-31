import React, { useEffect, useState } from 'react';
import { reviewsService } from '@/services/api/reviews.service';
import { PlaceReview } from '@shared/types/social';
import { Place } from '@shared/types/places';

interface PlaceReviewsProps {
  place: Place;
  coordinates: { longitude: number; latitude: number };
  onReviewComplete?: () => void;
}

export const PlaceReviews: React.FC<PlaceReviewsProps> = ({
  place,
  coordinates,
  onReviewComplete,
}) => {
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadReviews();
  }, [place.id]);

  const loadReviews = async () => {
    if (!place.id) return;

    setIsLoading(true);
    try {
      const response = await reviewsService.getReviewsForPlace(place.id);
      setReviews(response.reviews);
      setAverageRating(response.averageRating);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reviewsService.createReview({
        coordinates,
        placeName: place.name,
        placeId: place.id,
        rating,
        comment: comment.trim() || undefined,
      });
      setComment('');
      setShowReviewForm(false);
      loadReviews();
      onReviewComplete?.();
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      alert(error.message || 'Failed to submit review');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
          {averageRating > 0 && (
            <div className="text-sm text-gray-600">
              Average: {averageRating.toFixed(1)} / 5.0
            </div>
          )}
        </div>
        <button
          onClick={() => setShowReviewForm(!showReviewForm)}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {showReviewForm ? 'Cancel' : 'Write Review'}
        </button>
      </div>

      {showReviewForm && (
        <form onSubmit={handleSubmitReview} className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`text-2xl ${rating >= value ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Submit Review
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-4">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No reviews yet</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900">
                  {review.user?.email || 'Anonymous'}
                </div>
                <div className="flex items-center">
                  <span className="text-yellow-400">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </span>
                </div>
              </div>
              {review.comment && (
                <div className="text-sm text-gray-700 mt-1">{review.comment}</div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                {new Date(review.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

