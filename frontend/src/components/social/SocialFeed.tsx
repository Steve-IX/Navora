import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowPathIcon,
  MapPinIcon,
  ChatBubbleLeftIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import { FeedItem } from '@shared/types/social';
import { apiClient } from '@/services/api/client';

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
            <NewspaperIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">Social Feed</h2>
            <p className="text-xs text-gray-500 dark:text-dark-text-muted">
              {feedItems.length} {feedItems.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, rotate: 180 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadFeed}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-dark-bg-tertiary text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-overlay disabled:opacity-50 transition-colors"
          aria-label="Refresh feed"
        >
          <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {isLoading && feedItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
          />
        </div>
      ) : feedItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-dark-bg-tertiary flex items-center justify-center mx-auto mb-4">
              <NewspaperIcon className="w-10 h-10 text-gray-400 dark:text-dark-text-muted" />
            </div>
            <p className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">No activity yet</p>
            <p className="text-sm text-gray-500 dark:text-dark-text-muted max-w-[200px]">
              Add friends to see their check-ins and activity here
            </p>
          </div>
        </div>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 overflow-y-auto space-y-3"
        >
          {feedItems.map((item) => (
            <FeedItemCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

const FeedItemCard: React.FC<{ item: FeedItem }> = ({ item }) => {
  const timeAgo = (date: string | Date) => {
    const timestamp = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.01 }}
      className="p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-xl hover:shadow-md transition-all"
    >
      {/* User Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold">
            {(item.userName || 'U')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">{item.userName}</p>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">{timeAgo(item.timestamp)}</p>
        </div>
      </div>

      {/* Content */}
      {item.type === 'checkin' && (
        <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <MapPinIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Checked in at</p>
              <p className="font-medium text-gray-900 dark:text-dark-text-primary">{item.data.placeName}</p>
            </div>
          </div>
          {item.data.note && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-border-default flex items-start gap-2">
              <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{item.data.note}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
