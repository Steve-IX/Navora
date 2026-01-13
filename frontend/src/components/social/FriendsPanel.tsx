import React, { useEffect, useState, useRef } from 'react';
import { useFriendsStore } from '@/stores/friendsStore';
import { useAuthStore } from '@/stores/authStore';

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
  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFriends();
      fetchRequests();
    }
  }, [fetchFriends, fetchRequests, isAuthenticated]);

  useEffect(() => {
    // Clear search when component unmounts or tab changes
    return () => {
      clearSearch();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [clearSearch]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      // Debounce search
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
      // Refresh sent requests to show the new request
      await fetchRequests();
      // Clear search and switch to sent tab
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

  // Check if user is already a friend or has pending request
  const getUserStatus = (userId: string) => {
    if (friends.some((f) => f.friend.id === userId)) {
      return 'friend';
    }
    if (sentRequests.some((r) => r.user.id === userId)) {
      return 'pending';
    }
    return 'none';
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-gray-600 dark:text-dark-text-secondary mb-4">Please sign in to use Friends features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search for users by email or name..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary placeholder-gray-500 dark:placeholder-dark-text-muted"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-dark-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-border-default mb-4">
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setActiveTab('friends');
              setSearchQuery('');
              clearSearch();
            }}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'friends'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('received');
              setSearchQuery('');
              clearSearch();
            }}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'received'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary'
            }`}
          >
            Received ({receivedRequests.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('sent');
              setSearchQuery('');
              clearSearch();
            }}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'sent'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary'
            }`}
          >
            Sent ({sentRequests.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading && activeTab !== 'search' && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Search Results */}
        {activeTab === 'search' && (
          <div className="space-y-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-dark-text-muted">
                {searchQuery.trim().length >= 2
                  ? 'No users found'
                  : 'Type at least 2 characters to search'}
              </div>
            ) : (
              searchResults.map((user) => {
                const status = getUserStatus(user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-lg hover:shadow-md dark:hover:shadow-dark-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName || user.email}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-dark-border-default"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-dark-text-primary">
                          {user.displayName || user.email}
                        </div>
                        {user.displayName && (
                          <div className="text-sm text-gray-500 dark:text-dark-text-secondary">{user.email}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      {status === 'friend' ? (
                        <span className="px-3 py-1 text-sm text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-bg-tertiary rounded">
                          Friends
                        </span>
                      ) : status === 'pending' ? (
                        <span className="px-3 py-1 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(user.id)}
                          disabled={isLoading}
                          className="px-4 py-1.5 text-sm bg-primary-600 dark:bg-primary-500 text-white rounded hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-colors"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-dark-text-muted">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-dark-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-lg font-medium mb-2 text-gray-900 dark:text-dark-text-primary">No friends yet</p>
                <p className="text-sm">Search for users above to add friends</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-lg hover:shadow-md dark:hover:shadow-dark-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                        {(friend.friend.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-dark-text-primary">{friend.friend.email}</div>
                      <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
                        Friends since {new Date(friend.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(friend.id)}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Received Requests */}
        {activeTab === 'received' && (
          <div className="space-y-2">
            {receivedRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-dark-text-muted">
                <p className="text-lg font-medium mb-2 text-gray-900 dark:text-dark-text-primary">No pending requests</p>
                <p className="text-sm">Friend requests you receive will appear here</p>
              </div>
            ) : (
              receivedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-lg hover:shadow-md dark:hover:shadow-dark-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                        {(request.user.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-dark-text-primary">{request.user.email}</div>
                      <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="px-4 py-1.5 text-sm bg-primary-600 dark:bg-primary-500 text-white rounded hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(request.id)}
                      className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary rounded hover:bg-gray-300 dark:hover:bg-dark-bg-overlay transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sent Requests */}
        {activeTab === 'sent' && (
          <div className="space-y-2">
            {sentRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-dark-text-muted">
                <p className="text-lg font-medium mb-2 text-gray-900 dark:text-dark-text-primary">No sent requests</p>
                <p className="text-sm">Friend requests you send will appear here</p>
              </div>
            ) : (
              sentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-lg hover:shadow-md dark:hover:shadow-dark-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                        {(request.user.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-dark-text-primary">{request.user.email}</div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">Pending</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
