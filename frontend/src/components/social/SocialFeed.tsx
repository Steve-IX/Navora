import React, { useEffect, useState } from 'react';
import { FeedItem } from '@shared/types/social';
import { apiClient } from '@/services/api/client';

export const SocialFeed: React.FC = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.instance.get<FeedItem[]>('/feeds', {
        params: { limit: 50 },
      });
      setFeedItems(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Social Feed</h2>
        <button
          onClick={loadFeed}
          className="px-3 py-1 text-sm bg-gray-100 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary rounded hover:bg-gray-200 dark:hover:bg-dark-bg-overlay"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-dark-text-muted">
          No activity from friends yet. Make some friends to see their check-ins!
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {feedItems.map((item) => (
            <FeedItemCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

const FeedItemCard: React.FC<{ item: FeedItem }> = ({ item }) => {
  return (
    <div className="p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-lg hover:shadow-md dark:hover:shadow-dark-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{item.userName}</div>
        <div className="text-xs text-gray-500 dark:text-dark-text-muted">
          {new Date(item.timestamp).toLocaleString()}
        </div>
      </div>
      {item.type === 'checkin' && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📍</span>
            <span className="font-medium text-gray-900 dark:text-dark-text-primary">{item.data.placeName}</span>
          </div>
          {item.data.note && (
            <div className="text-sm text-gray-700 dark:text-dark-text-secondary mt-1">{item.data.note}</div>
          )}
        </div>
      )}
    </div>
  );
};

