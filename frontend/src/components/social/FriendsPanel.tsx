import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  InboxIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  UserMinusIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useFriendsStore } from '@/stores/friendsStore';
import { useAuthStore } from '@/stores/authStore';

const tabs = [
  { id: 'friends', label: 'Friends', icon: UserGroupIcon },
  { id: 'received', label: 'Requests', icon: InboxIcon },
  { id: 'sent', label: 'Sent', icon: PaperAirplaneIcon },
] as const;

type TabId = typeof tabs[number]['id'] | 'search';

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export const FriendsPanel: React.FC = () => {
  const {
    friends,
    receivedRequests,
    sentRequests,
    searchResults,
    isSearching,
    isLoading,
    error,
    fetchFriends,
    fetchRequests,
    searchUsers,
    clearSearch,
    addFriend,
    acceptRequest,
    declineRequest,
    removeFriend,
  } = useFriendsStore();

  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedSearch, setFocusedSearch] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFriends();
      fetchRequests();
    }
  }, [fetchFriends, fetchRequests, isAuthenticated]);

  useEffect(() => {
    return () => {
      clearSearch();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [clearSearch]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        setActiveTab('search');
        searchUsers(value);
      }, 300);
    } else {
      clearSearch();
      if (activeTab === 'search') {
        setActiveTab('friends');
      }
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await addFriend(userId);
      await fetchRequests();
      setSearchQuery('');
      clearSearch();
      setActiveTab('sent');
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await declineRequest(requestId);
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
  };

  const handleRemove = async (friendshipId: string) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      try {
        await removeFriend(friendshipId);
      } catch (err) {
        console.error('Failed to remove friend:', err);
      }
    }
  };

  const getUserStatus = (userId: string) => {
    if (friends.some((f) => f.friend.id === userId)) return 'friend';
    if (sentRequests.some((r) => r.user.id === userId)) return 'pending';
    return 'none';
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-bg-tertiary flex items-center justify-center mx-auto mb-4">
            <UserGroupIcon className="w-8 h-8 text-gray-400 dark:text-dark-text-muted" />
          </div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Please sign in to use Friends</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="mb-4">
        <div className={`relative rounded-xl border-2 transition-all duration-200 ${
          focusedSearch
            ? 'border-brand-500 ring-4 ring-brand-500/10'
            : 'border-gray-200 dark:border-dark-border-default'
        }`}>
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setFocusedSearch(true)}
            onBlur={() => setFocusedSearch(false)}
            placeholder="Search users by email or name..."
            className="w-full pl-11 pr-4 py-3 bg-transparent text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted focus:outline-none rounded-xl"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-dark-bg-tertiary rounded-xl mb-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const count = tab.id === 'friends' ? friends.length
            : tab.id === 'received' ? receivedRequests.length
            : sentRequests.length;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
                clearSearch();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary shadow-sm'
                  : 'text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  isActive
                    ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                    : 'bg-gray-200 dark:bg-dark-bg-overlay text-gray-600 dark:text-dark-text-secondary'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
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

      {/* Loading */}
      {isLoading && activeTab !== 'search' && (
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Search Results */}
          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
                  />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-text-muted" />
                  <p className="text-gray-500 dark:text-dark-text-muted">
                    {searchQuery.trim().length >= 2 ? 'No users found' : 'Type at least 2 characters'}
                  </p>
                </div>
              ) : (
                <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
                  {searchResults.map((user) => {
                    const status = getUserStatus(user.id);
                    return (
                      <motion.div
                        key={user.id}
                        variants={itemVariants}
                        className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-xl hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-11 h-11 rounded-xl object-cover" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {(user.displayName || user.email || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-dark-text-primary truncate">
                              {user.displayName || user.email}
                            </p>
                            {user.displayName && (
                              <p className="text-sm text-gray-500 dark:text-dark-text-muted truncate">{user.email}</p>
                            )}
                          </div>
                        </div>
                        {status === 'friend' ? (
                          <span className="px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            Friends
                          </span>
                        ) : status === 'pending' ? (
                          <span className="px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" /> Pending
                          </span>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAddFriend(user.id)}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white rounded-lg shadow-md shadow-brand-500/25 disabled:opacity-50 transition-all flex items-center gap-1.5"
                          >
                            <UserPlusIcon className="w-4 h-4" /> Add
                          </motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Friends List */}
          {activeTab === 'friends' && (
            <motion.div key="friends" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {friends.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-bg-tertiary flex items-center justify-center mx-auto mb-4">
                    <UserGroupIcon className="w-8 h-8 text-gray-400 dark:text-dark-text-muted" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">No friends yet</p>
                  <p className="text-sm text-gray-500 dark:text-dark-text-muted">Search for users to add friends</p>
                </div>
              ) : (
                <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
                  {friends.map((friend) => (
                    <motion.div
                      key={friend.id}
                      variants={itemVariants}
                      className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {(friend.friend.email || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-dark-text-primary">{friend.friend.email}</p>
                          <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                            Since {new Date(friend.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRemove(friend.id)}
                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <UserMinusIcon className="w-5 h-5" />
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Received Requests */}
          {activeTab === 'received' && (
            <motion.div key="received" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {receivedRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-bg-tertiary flex items-center justify-center mx-auto mb-4">
                    <InboxIcon className="w-8 h-8 text-gray-400 dark:text-dark-text-muted" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">No requests</p>
                  <p className="text-sm text-gray-500 dark:text-dark-text-muted">Friend requests will appear here</p>
                </div>
              ) : (
                <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
                  {receivedRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      variants={itemVariants}
                      className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {(request.user.email || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-dark-text-primary">{request.user.email}</p>
                          <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAccept(request.id)}
                          className="p-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        >
                          <CheckIcon className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDecline(request.id)}
                          className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Sent Requests */}
          {activeTab === 'sent' && (
            <motion.div key="sent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {sentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-bg-tertiary flex items-center justify-center mx-auto mb-4">
                    <PaperAirplaneIcon className="w-8 h-8 text-gray-400 dark:text-dark-text-muted" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">No sent requests</p>
                  <p className="text-sm text-gray-500 dark:text-dark-text-muted">Requests you send will appear here</p>
                </div>
              ) : (
                <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
                  {sentRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      variants={itemVariants}
                      className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {(request.user.email || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-dark-text-primary">{request.user.email}</p>
                          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" /> Pending
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
