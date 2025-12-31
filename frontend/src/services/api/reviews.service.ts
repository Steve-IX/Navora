import { apiClient } from './client';
import { PlaceReview } from '@shared/types/social';
import { Coordinates } from '@shared/types/geocoding';

export interface CreateReviewDto {
  coordinates: Coordinates;
  placeName: string;
  placeId?: string;
  rating: number;
  comment?: string;
}

export interface ReviewResponse {
  reviews: PlaceReview[];
  averageRating: number;
}

export const reviewsService = {
  async createReview(data: CreateReviewDto): Promise<PlaceReview> {
    const response = await apiClient.instance.post<PlaceReview>('/reviews', data);
    return response.data;
  },

  async getReviewsForPlace(placeId: string, limit?: number): Promise<ReviewResponse> {
    const response = await apiClient.instance.get<ReviewResponse>(`/reviews/place/${placeId}`, {
      params: { limit },
    });
    return response.data;
  },

  async getReviewsNearby(coordinates: Coordinates, radius?: number, limit?: number): Promise<PlaceReview[]> {
    const response = await apiClient.instance.get<PlaceReview[]>('/reviews/nearby', {
      params: {
        lng: coordinates.longitude,
        lat: coordinates.latitude,
        radius,
        limit,
      },
    });
    return response.data;
  },

  async deleteReview(reviewId: string): Promise<void> {
    await apiClient.instance.delete(`/reviews/${reviewId}`);
  },
};

